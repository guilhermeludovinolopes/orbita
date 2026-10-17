"use client";

import { useEffect, useRef, useState } from "react";
import { Map as Mapa, setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import paises from "i18n-iso-countries";
import pt from "i18n-iso-countries/langs/pt.json";
import { situacaoPorPais, type Situacao } from "@/lib/visitas-exemplo";
import estilos from "./Globo.module.css";

paises.registerLocale(pt);
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); // copiado por scripts/copiar-worker-maplibre.mjs

const COR = {
  oceano: "#13294B", // Marinho
  naoVisitado: "#D8CFBF", // pastel (em avaliação)
  visitado: "#2E6A4F", // verde (em avaliação)
  completo: "#C9A34E", // Dourado
  aguaRasa: "#265492", // mar raso da foto da NASA (o mesmo de scripts/gerar-oceano.mjs)
};

// Países que cruzam a linha de data (Fiji, Rússia...) vêm com pontos em -180 e +180 no mesmo
// contorno, e o mapa liga um lado ao outro com uma linha atravessando o globo. Passar os pontos
// negativos para além de 180° mantém o contorno contínuo.
function costurarLinhaDeData(f: GeoJSON.Feature) {
  const g = f.geometry;
  const poligonos = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  for (const poligono of poligonos) {
    for (const anel of poligono) {
      const lngs = anel.map((p) => p[0]);
      if (Math.max(...lngs) - Math.min(...lngs) <= 180) continue;
      for (const p of anel) if (p[0] < 0) p[0] += 360;
    }
  }
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

type PaisSelecionado = { codigo: string; nome: string; situacao: Situacao | null };

export default function Globo() {
  const recipiente = useRef<HTMLDivElement>(null);
  const ceu = useRef<HTMLCanvasElement>(null);
  const [selecionado, setSelecionado] = useState<PaisSelecionado | null>(null);

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

    const mapa = new Mapa({
      container: recipiente.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        // Atmosfera bem sutil, que some ao aproximar
        sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.35, 4, 0.15, 6, 0] },
        sources: {
          // Mar realista: Blue Marble da NASA reprojetada (ver scripts/gerar-oceano.mjs)
          mar: {
            type: "image",
            url: "/geo/oceano.jpg",
            coordinates: CANTOS_MERCATOR,
          },
        },
        layers: [
          { id: "oceano", type: "background", paint: { "background-color": COR.oceano } },
          { id: "mar", type: "raster", source: "mar", paint: { "raster-fade-duration": 0 } },
        ],
      },
      center: [-30, 10],
      // Telas estreitas (celular) precisam de um globo menor para caber inteiro
      zoom: recipiente.current.clientWidth < 600 ? 1.1 : 2,
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

    // Busca os contornos já, em paralelo com a preparação do mapa
    const contornos = import("world-atlas/countries-50m.json");
    // O Reino Unido aparece como 4 nações (ver scripts/extrair-nacoes-reino-unido.mjs)
    const nacoesReinoUnido = fetch("/geo/reino-unido.json").then((r) => r.json() as Promise<GeoJSON.FeatureCollection>);

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
      for (const f of colecao.features) {
        f.properties!.situacao = situacaoPorPais[f.properties!.codigo] ?? "";
      }

      mapa.addSource("paises", { type: "geojson", data: colecao, promoteId: "codigo" });

      const preenchimento: ExpressionSpecification = [
        "match",
        ["get", "situacao"],
        "completo", COR.completo,
        "visitado", COR.visitado,
        COR.naoVisitado,
      ];
      mapa.addLayer({
        id: "paises",
        type: "fill",
        source: "paises",
        paint: { "fill-color": preenchimento },
      });

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

      // Divisas na cor do oceano: separam os países sem desenhar uma borda visível
      mapa.addLayer({
        id: "divisas",
        type: "line",
        source: "paises",
        paint: { "line-color": COR.oceano, "line-width": 0.6 },
      });
      // Contorno em Papel no país sob o mouse
      mapa.addLayer({
        id: "destaque",
        type: "line",
        source: "paises",
        paint: {
          "line-color": "#F5F0E8",
          "line-width": 1.6,
          "line-opacity": ["case", ["boolean", ["feature-state", "sobre"], false], 1, 0],
        },
      });

      let sobre: string | null = null;
      mapa.on("mousemove", "paises", (e) => {
        const codigo = e.features?.[0]?.properties?.codigo as string | undefined;
        if (!codigo || codigo === sobre) return;
        if (sobre) mapa.setFeatureState({ source: "paises", id: sobre }, { sobre: false });
        sobre = codigo;
        mapa.setFeatureState({ source: "paises", id: codigo }, { sobre: true });
        mapa.getCanvas().style.cursor = "pointer";
      });
      mapa.on("mouseleave", "paises", () => {
        if (sobre) mapa.setFeatureState({ source: "paises", id: sobre }, { sobre: false });
        sobre = null;
        mapa.getCanvas().style.cursor = "";
      });

      mapa.on("click", "paises", (e) => {
        const propriedades = e.features?.[0]?.properties;
        const codigo = propriedades?.codigo as string | undefined;
        if (!codigo) return;
        girando = false;
        setSelecionado({
          codigo,
          nome: (propriedades?.nome as string) || codigo,
          situacao: situacaoPorPais[codigo] ?? null,
        });
        mapa.flyTo({ center: e.lngLat, zoom: Math.max(mapa.getZoom(), 2.6), duration: 1200 });
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
          <p className={estilos.rotulo}>{selecionado.codigo}</p>
          <h2 className={estilos.nome}>{selecionado.nome}</h2>
          <p className={estilos.situacao}>
            {selecionado.situacao === "completo"
              ? "Completo — você visitou tudo aqui"
              : selecionado.situacao === "visitado"
                ? "Visitado"
                : "Ainda não visitado"}
          </p>
          <p className={estilos.nota}>Em breve: o mapa por estados e municípios.</p>
        </aside>
      )}
    </div>
  );
}
