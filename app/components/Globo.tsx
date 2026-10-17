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

type PaisSelecionado ={ codigo: string; nome: string; situacao: Situacao | null };

export default function Globo() {
  const recipiente = useRef<HTMLDivElement>(null);
  const [selecionado, setSelecionado] = useState<PaisSelecionado | null>(null);

  useEffect(() => {
    if (!recipiente.current) return;

    const mapa = new Mapa({
      container: recipiente.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        sky: { "atmosphere-blend": 0 },
        sources: {},
        layers: [{ id: "oceano", type: "background", paint: { "background-color": COR.oceano } }],
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

    mapa.once("style.load", async () => {
      const topo = (await contornos).default as unknown as Topology;
      const colecao = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection;
      colecao.features.forEach(costurarLinhaDeData);
      for (const f of colecao.features) {
        const codigo = f.id ? paises.numericToAlpha2(String(f.id)) : undefined;
        f.properties = { ...f.properties, codigo: codigo ?? "", situacao: (codigo && situacaoPorPais[codigo]) || "" };
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
        paint: {
          "fill-color": preenchimento,
          "fill-opacity": ["case", ["boolean", ["feature-state", "sobre"], false], 0.85, 1],
        },
      });
      // Divisas na cor do oceano: separam os países sem desenhar uma borda visível
      mapa.addLayer({
        id: "divisas",
        type: "line",
        source: "paises",
        paint: { "line-color": COR.oceano, "line-width": 0.6 },
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
        const codigo = e.features?.[0]?.properties?.codigo as string | undefined;
        if (!codigo) return;
        girando = false;
        setSelecionado({
          codigo,
          nome: paises.getName(codigo, "pt") ?? codigo,
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
