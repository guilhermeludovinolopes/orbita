"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as Mapa,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type LngLat,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type PointLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import paises from "i18n-iso-countries";
import pt from "i18n-iso-countries/langs/pt.json";
import { carregarVisitas, resumir, situacao, type Resumo, type Situacao, type Visita } from "@/lib/visitas";
import { DETALHE_PAISES } from "@/lib/detalhe-paises";
import estilos from "./Globo.module.css";

paises.registerLocale(pt);
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); // copiado por scripts/copiar-worker-maplibre.mjs

const COR = {
  oceano: "#13294B", // Marinho
  naoVisitado: "#D8CFBF", // pastel (em avaliação)
  visitado: "#2E6A4F", // verde (em avaliação)
  completo: "#E2B23A", // Dourado mais vivo no mapa, para brilhar (o Dourado da marca é #C9A34E)
  brilho: "#F6D36B", // halo em volta das áreas completas
  pelicula: "#000F0C", // Tinta: escurece o que está fora do país em foco
  foco: "#F5F0E8", // Papel: contorno do país em foco
  divisa: "#3B2418", // Marrom Café
  destaque: "#6B1420", // Bordô
  aguaRasa: "#265492", // mar raso da foto da NASA (o mesmo de scripts/gerar-oceano.mjs)
};

// Países que cruzam a linha de data (Fiji, Rússia...) vêm com pontos em -180 e +180 no mesmo
// contorno, e o mapa liga um lado ao outro com uma linha atravessando o globo. Passar os pontos
// negativos para além de 180° mantém o contorno contínuo.
function costurarLinhaDeData(f: GeoJSON.Feature) {
  for (const poligono of poligonosDe(f)) {
    for (const anel of poligono) {
      const lngs = anel.map((p) => p[0]);
      if (Math.max(...lngs) - Math.min(...lngs) <= 180) continue;
      for (const p of anel) if (p[0] < 0) p[0] += 360;
    }
  }
}

function poligonosDe(f: GeoJSON.Feature): GeoJSON.Position[][][] {
  const g = f.geometry;
  return g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
}

function limitesDe(features: GeoJSON.Feature[]): LngLatBoundsLike {
  let [oeste, sul, leste, norte] = [180, 90, -180, -90];
  for (const f of features) {
    for (const poligono of poligonosDe(f)) {
      for (const [lng, lat] of poligono[0]) {
        oeste = Math.min(oeste, lng);
        leste = Math.max(leste, lng);
        sul = Math.min(sul, lat);
        norte = Math.max(norte, lat);
      }
    }
  }
  return [[oeste, sul], [leste, norte]];
}

const CODIGO_NUMERICO_REINO_UNIDO = "826";
const LAT_MAX_MERCATOR = 85.0511287798;
// Cantos do mundo inteiro em Web Mercator, para as imagens do mar e do relevo
const CANTOS_MERCATOR: [[number, number], [number, number], [number, number], [number, number]] = [
  [-180, LAT_MAX_MERCATOR],
  [180, LAT_MAX_MERCATOR],
  [180, -LAT_MAX_MERCATOR],
  [-180, -LAT_MAX_MERCATOR],
];

// Céu estrelado fixo: pontos com posição e brilho sorteados uma vez por tela
function desenharEstrelas(tela: HTMLCanvasElement) {
  const escala = window.devicePixelRatio || 1;
  tela.width = tela.clientWidth * escala;
  tela.height = tela.clientHeight * escala;
  const ctx = tela.getContext("2d");
  if (!ctx) return;
  const quantidade = Math.round((tela.clientWidth * tela.clientHeight) / 2500);
  for (let i = 0; i < quantidade; i++) {
    const raio = (Math.random() < 0.9 ? 0.5 : 0.9) * escala;
    ctx.globalAlpha = 0.25 + Math.random() * 0.6;
    ctx.fillStyle = "#F5F0E8"; // Papel
    ctx.beginPath();
    ctx.arc(Math.random() * tela.width, Math.random() * tela.height, raio, 0, Math.PI * 2);
    ctx.fill();
  }
}

const PREENCHIMENTO: ExpressionSpecification = [
  "match",
  ["get", "situacao"],
  "completo", COR.completo,
  "visitado", COR.visitado,
  COR.naoVisitado,
];

// As três camadas do zoom: o que aparece em cada nível e quão grossas são as divisas
const NIVEIS = {
  paises: { divisa: [1, 0.5, 4, 0.9, 7, 1.4], destaque: [1, 1.8, 4, 2.6, 7, 3.4] },
  estados: { divisa: [3, 0.6, 6, 1.2, 9, 1.6], destaque: [3, 2.2, 6, 3, 9, 3.6] },
  municipios: { divisa: [5, 0.25, 8, 0.6, 11, 1], destaque: [5, 1.6, 8, 2.4, 11, 3] },
} as const;
type Camada = keyof typeof NIVEIS;

type Nivel = { pais?: string; nomePais?: string; estado?: string; nomeEstado?: string };

type Selecionado = {
  tipo: "país" | "estado" | "município";
  codigo: string;
  nome: string;
  situacao: Situacao | null;
  resumo: Resumo | null;
  contagem?: string; // ex.: "12 de 27 estados · 40 de 5.570 municípios"
};

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

function detalhe({ visitas, lugares, primeiroAno, ultimoAno }: Resumo, tipo: Selecionado["tipo"]) {
  const anos = primeiroAno === ultimoAno ? `${primeiroAno}` : `${primeiroAno}–${ultimoAno}`;
  const partes = [plural(visitas, "visita", "visitas")];
  if (tipo !== "município") partes.push(plural(lugares, "lugar", "lugares"));
  return [...partes, anos].join(" · ");
}

function textoSituacao(s: Selecionado) {
  if (s.situacao === "completo") return `Completo — você visitou todos os municípios`;
  if (s.situacao === "visitado") return "Visitado";
  return "Ainda não visitado";
}

const cache = new Map<string, Promise<GeoJSON.FeatureCollection>>();
const buscarGeo = (url: string) => {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => r.json()));
  return cache.get(url)!;
};

export default function Globo() {
  const recipiente = useRef<HTMLDivElement>(null);
  const ceu = useRef<HTMLCanvasElement>(null);
  const [selecionado, setSelecionado] = useState<Selecionado | null>(null);
  const [nivel, setNivel] = useState<Nivel>({});
  const voltarRef = useRef<() => void>(() => {});

  useEffect(() => {
    const tela = ceu.current;
    if (!tela) return;
    desenharEstrelas(tela);
    const redesenhar = () => desenharEstrelas(tela);
    window.addEventListener("resize", redesenhar);
    return () => window.removeEventListener("resize", redesenhar);
  }, []);

  useEffect(() => {
    if (!recipiente.current) return;
    const celular = recipiente.current.clientWidth < 600;

    const mapa = new Mapa({
      container: recipiente.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        // Atmosfera bem sutil, que some ao aproximar
        sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.35, 4, 0.15, 6, 0] },
        sources: {
          // Mar realista: Blue Marble da NASA reprojetada (ver scripts/gerar-oceano.mjs)
          mar: { type: "image", url: "/geo/oceano.jpg", coordinates: CANTOS_MERCATOR },
        },
        layers: [
          { id: "oceano", type: "background", paint: { "background-color": COR.oceano } },
          { id: "mar", type: "raster", source: "mar", paint: { "raster-fade-duration": 0 } },
        ],
      },
      center: [-30, 10],
      // Telas estreitas (celular) precisam de um globo menor para caber inteiro
      zoom: celular ? 1.1 : 2,
      attributionControl: false,
    });

    let girando = true;
    const parar = () => (girando = false);
    mapa.on("mousedown", parar);
    mapa.on("touchstart", parar);
    mapa.on("wheel", parar);

    let quadro = 0;
    const girar = () => {
      if (girando) {
        const c = mapa.getCenter();
        mapa.setCenter([c.lng + 0.03, c.lat]);
      }
      quadro = requestAnimationFrame(girar);
    };

    // Busca os contornos e as visitas já, em paralelo com a preparação do mapa
    const contornos = import("world-atlas/countries-50m.json");
    // O Reino Unido aparece como 4 nações (ver scripts/extrair-nacoes-reino-unido.mjs)
    const nacoesReinoUnido = buscarGeo("/geo/reino-unido.json");
    // Se o banco falhar, o globo aparece todo como não visitado
    let visitas: Visita[] = [];
    const visitasCarregadas = carregarVisitas().catch((erro) => {
      console.error("Não consegui carregar as visitas", erro);
      return [];
    });

    const atual: Nivel = {};
    const padding = celular ? 24 : 80;

    // Adiciona (ou troca) uma camada de áreas: preenchimento por situação, divisas e destaque
    function mostrarCamada(camada: Camada, features: GeoJSON.Feature[]) {
      esconderCamada(camada);
      mapa.addSource(camada, { type: "geojson", data: { type: "FeatureCollection", features }, promoteId: "codigo" });
      mapa.addLayer({ id: camada, type: "fill", source: camada, paint: { "fill-color": PREENCHIMENTO } }, "relevo");
      adicionarBrilho(camada);
      mapa.addLayer({
        id: `${camada}-divisas`,
        type: "line",
        source: camada,
        layout: { "line-join": "round" },
        paint: {
          "line-color": COR.divisa,
          "line-width": ["interpolate", ["linear"], ["zoom"], ...NIVEIS[camada].divisa],
        },
      });
      mapa.addLayer({
        id: `${camada}-destaque`,
        type: "line",
        source: camada,
        layout: { "line-join": "round" },
        paint: {
          "line-color": COR.destaque,
          "line-width": ["interpolate", ["linear"], ["zoom"], ...NIVEIS[camada].destaque],
          "line-opacity": ["case", ["boolean", ["feature-state", "sobre"], false], 1, 0],
        },
      });
    }

    // Halo dourado desfocado em volta das áreas completas, para o dourado brilhar
    function adicionarBrilho(camada: Camada) {
      mapa.addLayer({
        id: `${camada}-brilho`,
        type: "line",
        source: camada,
        filter: ["==", ["get", "situacao"], "completo"],
        layout: { "line-join": "round" },
        paint: { "line-color": COR.brilho, "line-width": 6, "line-blur": 5, "line-opacity": 0.85 },
      });
    }

    // Foco: escurece os outros países e o mar, e o país em foco ganha contorno em Papel
    let contornosPaises: GeoJSON.Feature[] = [];
    function focar(codigo: string) {
      const pais = contornosPaises.find((f) => f.properties?.codigo === codigo);
      if (!pais) return;
      mapa.setFilter("pelicula", ["!=", ["get", "codigo"], codigo]);
      mapa.setLayoutProperty("pelicula", "visibility", "visible");
      mapa.setPaintProperty("mar", "raster-brightness-max", 0.45);
      (mapa.getSource("foco") as GeoJSONSource).setData(pais);
    }
    function desfocar() {
      if (!mapa.getLayer("pelicula")) return;
      mapa.setLayoutProperty("pelicula", "visibility", "none");
      mapa.setPaintProperty("mar", "raster-brightness-max", 1);
      (mapa.getSource("foco") as GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    }

    function esconderCamada(camada: Camada) {
      for (const id of [`${camada}-destaque`, `${camada}-divisas`, `${camada}-brilho`, camada]) if (mapa.getLayer(id)) mapa.removeLayer(id);
      if (mapa.getSource(camada)) mapa.removeSource(camada);
    }

    // A camada mais funda visível é a que responde ao mouse
    const camadasAtivas = (): Camada[] =>
      atual.estado ? ["municipios", "estados", "paises"] : atual.pais ? ["estados", "paises"] : ["paises"];

    function featureSob(ponto: PointLike): MapGeoJSONFeature | undefined {
      const [f] = mapa.queryRenderedFeatures(ponto, { layers: camadasAtivas().filter((c) => mapa.getLayer(c)) });
      return f;
    }

    function mostrarMundo() {
      desfocar();
      esconderCamada("municipios");
      esconderCamada("estados");
      delete atual.pais;
      delete atual.nomePais;
      delete atual.estado;
      delete atual.nomeEstado;
      setNivel({});
    }

    async function entrarNoPais(codigo: string, nome: string) {
      const det = DETALHE_PAISES[codigo];
      const doPais = visitas.filter((v) => v.pais === codigo);
      const geo = await buscarGeo(det.estados);
      const estados = geo.features.map((f) => {
        const resumo = resumir(doPais.filter((v) => v.nivel1 === f.properties!.codigo));
        return { ...f, properties: { ...f.properties, situacao: situacao(resumo, f.properties!.total) ?? "" } };
      });
      esconderCamada("municipios");
      focar(codigo);
      mostrarCamada("estados", estados);
      mapa.moveLayer("foco"); // contorno do país por cima das divisas dos estados
      Object.assign(atual, { pais: codigo, nomePais: nome });
      delete atual.estado;
      delete atual.nomeEstado;
      setNivel({ ...atual });

      const resumo = resumir(doPais);
      const estadosVisitados = estados.filter((f) => f.properties.situacao).length;
      setSelecionado({
        tipo: "país",
        codigo,
        nome,
        situacao: situacao(resumo, det.totalMunicipios),
        resumo,
        contagem: `${estadosVisitados} de ${estados.length} estados · ${(resumo?.lugares ?? 0).toLocaleString("pt-BR")} de ${det.totalMunicipios.toLocaleString("pt-BR")} municípios`,
      });
      mapa.fitBounds(limitesDe(geo.features), { padding, duration: 1400 });
    }

    async function entrarNoEstado(codigo: string, nome: string, total: number) {
      const det = DETALHE_PAISES[atual.pais!];
      const doEstado = visitas.filter((v) => v.nivel1 === codigo);
      const geo = await buscarGeo(det.municipios(codigo));
      const municipios = geo.features.map((f) => {
        const resumo = resumir(doEstado.filter((v) => v.municipio === f.properties!.codigo));
        return { ...f, properties: { ...f.properties, situacao: situacao(resumo) ?? "" } };
      });
      mostrarCamada("municipios", municipios);
      Object.assign(atual, { estado: codigo, nomeEstado: nome });
      setNivel({ ...atual });

      const resumo = resumir(doEstado);
      setSelecionado({
        tipo: "estado",
        codigo,
        nome,
        situacao: situacao(resumo, total),
        resumo,
        contagem: `${(resumo?.lugares ?? 0).toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} municípios`,
      });
      mapa.fitBounds(limitesDe(geo.features), { padding, duration: 1400 });
    }

    function mostrarMunicipio(codigo: string, nome: string) {
      const resumo = resumir(visitas.filter((v) => v.municipio === codigo && v.nivel1 === atual.estado));
      setSelecionado({ tipo: "município", codigo, nome, situacao: situacao(resumo), resumo });
    }

    function mostrarPaisSemDetalhe(codigo: string, nome: string, onde: LngLat) {
      const resumo = resumir(visitas.filter((v) => v.pais === codigo));
      setSelecionado({ tipo: "país", codigo, nome, situacao: situacao(resumo), resumo });
      mapa.flyTo({ center: onde, zoom: Math.max(mapa.getZoom(), 2.6), duration: 1200 });
    }

    voltarRef.current = () => {
      if (atual.estado) {
        const pais = atual.pais!;
        const nomePais = atual.nomePais!;
        esconderCamada("municipios");
        void entrarNoPais(pais, nomePais);
      } else {
        mostrarMundo();
        setSelecionado(null);
        mapa.flyTo({ zoom: celular ? 1.1 : 2, duration: 1200 });
      }
    };

    mapa.once("style.load", async () => {
      const topo = (await contornos).default as unknown as Topology;
      const colecao = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection;
      colecao.features = colecao.features.filter((f) => String(f.id) !== CODIGO_NUMERICO_REINO_UNIDO);
      colecao.features.forEach(costurarLinhaDeData);
      for (const f of colecao.features) {
        const codigo = f.id ? paises.numericToAlpha2(String(f.id)) : undefined;
        f.properties = { ...f.properties, codigo: codigo ?? "", nome: codigo ? paises.getName(codigo, "pt") : "" };
      }
      colecao.features.push(...(await nacoesReinoUnido).features);
      visitas = await visitasCarregadas;
      for (const f of colecao.features) {
        const codigo = f.properties!.codigo;
        const resumo = resumir(visitas.filter((v) => v.pais === codigo));
        f.properties!.situacao = situacao(resumo, DETALHE_PAISES[codigo]?.totalMunicipios) ?? "";
      }

      contornosPaises = colecao.features;
      mapa.addSource("paises", { type: "geojson", data: colecao, promoteId: "codigo" });
      mapa.addLayer({ id: "paises", type: "fill", source: "paises", paint: { "fill-color": PREENCHIMENTO } });

      // Relevo: sombras e luzes das montanhas por cima das cores (ver scripts/gerar-relevo.mjs)
      mapa.addSource("relevo", { type: "image", url: "/geo/relevo.png", coordinates: CANTOS_MERCATOR });
      mapa.addLayer({
        id: "relevo",
        type: "raster",
        source: "relevo",
        paint: { "raster-fade-duration": 0, "raster-resampling": "linear" },
      });

      // Lagos e rios na cor do mar raso (ver scripts/gerar-aguas.mjs)
      mapa.addSource("lagos", { type: "geojson", data: "/geo/lagos.json" });
      mapa.addLayer({ id: "lagos", type: "fill", source: "lagos", paint: { "fill-color": COR.aguaRasa } });
      mapa.addSource("rios", { type: "geojson", data: "/geo/rios.json" });
      mapa.addLayer({
        id: "rios",
        type: "line",
        source: "rios",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COR.aguaRasa,
          // Rios mais importantes (importância baixa) são mais grossos; todos engrossam com o zoom
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            2, ["max", 0.3, ["-", 1.2, ["*", 0.12, ["get", "importancia"]]]],
            6, ["max", 0.8, ["-", 2.6, ["*", 0.2, ["get", "importancia"]]]],
          ],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 1.5, 0.5, 3, 1],
        },
      });

      // Divisas em Marrom Café e contorno em Bordô no país sob o mouse
      mapa.addLayer({
        id: "paises-divisas",
        type: "line",
        source: "paises",
        layout: { "line-join": "round" },
        paint: {
          "line-color": COR.divisa,
          "line-width": ["interpolate", ["linear"], ["zoom"], ...NIVEIS.paises.divisa],
        },
      });
      mapa.addLayer({
        id: "paises-destaque",
        type: "line",
        source: "paises",
        layout: { "line-join": "round" },
        paint: {
          "line-color": COR.destaque,
          "line-width": ["interpolate", ["linear"], ["zoom"], ...NIVEIS.paises.destaque],
          "line-opacity": ["case", ["boolean", ["feature-state", "sobre"], false], 1, 0],
        },
      });

      adicionarBrilho("paises");

      // Película e contorno do país em foco (vazios até entrar num país)
      const vazio: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      mapa.addLayer({
        id: "pelicula",
        type: "fill",
        source: "paises",
        layout: { visibility: "none" },
        paint: { "fill-color": COR.pelicula, "fill-opacity": 0.6 },
      });
      mapa.addSource("foco", { type: "geojson", data: vazio });
      mapa.addLayer({
        id: "foco",
        type: "line",
        source: "foco",
        layout: { "line-join": "round" },
        paint: { "line-color": COR.foco, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 6, 2.5] },
      });

      // Destaque do mouse: só a área mais funda sob o cursor ganha o contorno Bordô
      let sobre: { camada: string; id: string } | null = null;
      const limparSobre = () => {
        if (sobre && mapa.getSource(sobre.camada)) mapa.setFeatureState({ source: sobre.camada, id: sobre.id }, { sobre: false });
        sobre = null;
      };
      mapa.on("mousemove", (e) => {
        const f = featureSob(e.point);
        const id = f?.properties?.codigo as string | undefined;
        if (f && id && sobre?.camada === f.source && sobre.id === id) return;
        limparSobre();
        if (f && id) {
          sobre = { camada: f.source, id };
          mapa.setFeatureState({ source: f.source, id }, { sobre: true });
        }
        mapa.getCanvas().style.cursor = f && id ? "pointer" : "";
      });
      mapa.on("mouseout", limparSobre);

      mapa.on("click", (e) => {
        const f = featureSob(e.point);
        const p = f?.properties;
        if (!f || !p?.codigo) return;
        girando = false;
        limparSobre();
        if (f.source === "municipios") return mostrarMunicipio(p.codigo, p.nome);
        if (f.source === "estados") return void entrarNoEstado(p.codigo, p.nome, p.total);
        // Clicou num país
        const nome = (p.nome as string) || p.codigo;
        if (DETALHE_PAISES[p.codigo]) {
          if (atual.pais !== p.codigo) void entrarNoPais(p.codigo, nome);
          return;
        }
        mostrarMundo();
        mostrarPaisSemDetalhe(p.codigo, nome, e.lngLat);
      });

      quadro = requestAnimationFrame(girar);
    });

    return () => {
      cancelAnimationFrame(quadro);
      mapa.remove();
    };
  }, []);

  return (
    <div className={estilos.area}>
      <canvas ref={ceu} className={estilos.ceu} aria-hidden="true" />
      <div ref={recipiente} className={estilos.mapa} />

      {nivel.pais && (
        <nav className={estilos.trilha} aria-label="Onde você está no mapa">
          <button className={estilos.voltar} onClick={() => voltarRef.current()}>
            ← {nivel.estado ? nivel.nomePais : "Mundo"}
          </button>
          <span className={estilos.caminho}>
            Mundo / {nivel.nomePais}
            {nivel.estado && ` / ${nivel.nomeEstado}`}
          </span>
        </nav>
      )}

      <ul className={estilos.legenda}>
        <li><span style={{ background: COR.naoVisitado }} />Não visitado</li>
        <li><span style={{ background: COR.visitado }} />Visitado</li>
        <li><span style={{ background: COR.completo }} />Completo</li>
      </ul>

      {selecionado && (
        <aside className={estilos.painel}>
          <button className={estilos.fechar} onClick={() => setSelecionado(null)} aria-label="Fechar">
            ×
          </button>
          <p className={estilos.rotulo}>
            {selecionado.tipo} · {selecionado.codigo}
          </p>
          <h2 className={estilos.nome}>{selecionado.nome}</h2>
          <p className={estilos.situacao}>{textoSituacao(selecionado)}</p>
          {selecionado.contagem && <p className={estilos.detalhe}>{selecionado.contagem}</p>}
          {selecionado.resumo && <p className={estilos.detalhe}>{detalhe(selecionado.resumo, selecionado.tipo)}</p>}
          {selecionado.tipo === "município" && selecionado.resumo && (
            <p className={estilos.anos}>{selecionado.resumo.anos.join(" · ")}</p>
          )}
          {selecionado.tipo === "país" && !DETALHE_PAISES[selecionado.codigo] && (
            <p className={estilos.nota}>Em breve: o mapa por estados e municípios.</p>
          )}
          {selecionado.tipo !== "município" && DETALHE_PAISES[nivel.pais ?? ""] && (
            <p className={estilos.nota}>Clique num {selecionado.tipo === "país" ? "estado" : "município"} para ver de perto.</p>
          )}
        </aside>
      )}
    </div>
  );
}
