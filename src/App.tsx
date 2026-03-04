import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, RefreshCw, PackageCheck, Gauge, Layers, ScanLine, Box, Target, CheckCircle2 } from 'lucide-react';
import { BoxScene } from './components/BoxScene';
import { OperatorTopView } from './components/OperatorTopView';
import { DEFAULT_RECIPE, WTS_BOX } from './data/presets';
import { buildPackingBlueprint, generateRandomRecipe } from './lib/packing';
import type { OrderRecipe } from './types';

function App() {
  const [recipe, setRecipe] = useState<OrderRecipe>(DEFAULT_RECIPE);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [confirmedShoes, setConfirmedShoes] = useState(0);

  const result = useMemo(() => buildPackingBlueprint(recipe, WTS_BOX), [recipe]);
  const shoePlacements = useMemo(
    () =>
      result.placements
        .filter((item) => item.category === 'shoe-box')
        .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER)),
    [result.placements],
  );
  const nextItem = shoePlacements[confirmedShoes];

  useEffect(() => {
    setConfirmedShoes(0);
  }, [recipe.shoeBoxes, recipe.apparel, recipe.accessories, recipe.caps]);

  const recalculate = () => {
    setRecipe((prev) => ({ ...prev, totalUnits: prev.shoeBoxes + prev.apparel + prev.accessories + prev.caps }));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ASRS → Goods to Picker</p>
          <h1>WTS Stack Blueprint Studio</h1>
          <p className="subtitle">Realtime visualisatie van stapelpatroon voor winkeldoos 70×50×45 cm</p>
        </div>
        <button className="ghost-btn" onClick={() => setRecipe(generateRandomRecipe())}>
          <RefreshCw size={16} /> Nieuw random recept
        </button>
      </header>

      <main className="layout-grid">
        <section className="panel scene-panel">
          <div className="panel-title-row">
            <h2>{viewMode === '3d' ? '3D Doos Visualisatie' : 'Operator Top-View'}</h2>
            <div className="view-switch" role="tablist" aria-label="View mode switch">
              <button className={`view-btn ${viewMode === '3d' ? 'active' : ''}`} onClick={() => setViewMode('3d')}>
                <Box size={14} /> 3D
              </button>
              <button className={`view-btn ${viewMode === '2d' ? 'active' : ''}`} onClick={() => setViewMode('2d')}>
                <ScanLine size={14} /> Operator 2D
              </button>
            </div>
          </div>
          {viewMode === '3d' ? (
            <div className="scene-wrapper">
              <BoxScene box={WTS_BOX} placements={result.placements} highlightedItemId={nextItem?.id} />
            </div>
          ) : (
            <div className="operator-wrapper">
              <OperatorTopView box={WTS_BOX} placements={result.placements} highlightedItemId={nextItem?.id} />
            </div>
          )}
        </section>

        <section className="panel control-panel">
          <div className="panel-title-row">
            <h2>Order Recept</h2>
            <span className="badge">Live</span>
          </div>

          <div className="control-group">
            <label>Schoenendozen</label>
            <input
              type="range"
              min={6}
              max={8}
              value={recipe.shoeBoxes}
              onChange={(event) => setRecipe((prev) => ({ ...prev, shoeBoxes: Number(event.target.value) }))}
            />
            <strong>{recipe.shoeBoxes}</strong>
          </div>

          <div className="control-group">
            <label>T-shirts & kleding</label>
            <input
              type="range"
              min={3}
              max={9}
              value={recipe.apparel}
              onChange={(event) => setRecipe((prev) => ({ ...prev, apparel: Number(event.target.value) }))}
            />
            <strong>{recipe.apparel}</strong>
          </div>

          <div className="control-group">
            <label>Accessoires</label>
            <input
              type="range"
              min={1}
              max={6}
              value={recipe.accessories}
              onChange={(event) => setRecipe((prev) => ({ ...prev, accessories: Number(event.target.value) }))}
            />
            <strong>{recipe.accessories}</strong>
          </div>

          <div className="control-group">
            <label>Caps</label>
            <input
              type="range"
              min={0}
              max={3}
              value={recipe.caps}
              onChange={(event) => setRecipe((prev) => ({ ...prev, caps: Number(event.target.value) }))}
            />
            <strong>{recipe.caps}</strong>
          </div>

          <button className="solid-btn" onClick={recalculate}>
            <PackageCheck size={18} /> Genereer blueprint
          </button>
        </section>

        <section className="panel kpi-panel">
          <div className="kpis">
            <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Boxes size={18} />
              <span>Totaal units</span>
              <strong>{recipe.shoeBoxes + recipe.apparel + recipe.accessories + recipe.caps}</strong>
            </motion.article>
            <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Gauge size={18} />
              <span>Blueprint score</span>
              <strong>{result.scores.overall}</strong>
            </motion.article>
            <motion.article className="kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Layers size={18} />
              <span>Gebruikte hoogte</span>
              <strong>{result.usedHeight} cm</strong>
            </motion.article>
          </div>

          <div className="sub-kpis">
            <span>Stabiliteit {result.scores.stability}</span>
            <span>Snelheid {result.scores.speed}</span>
            <span>Ease {result.scores.ease}</span>
            <span>Fill {Math.round(result.fillRate * 100)}%</span>
          </div>

          <div className="strategy-chip">Actieve strategie: {result.strategyLabel}</div>

          <div className="panel-title-row">
            <h2>Guided Pick Flow</h2>
          </div>
          <div className="guided-card">
            <div className="guided-progress-track">
              <div className="guided-progress-fill" style={{ width: `${(confirmedShoes / Math.max(shoePlacements.length, 1)) * 100}%` }} />
            </div>
            <p>
              Gereed: <strong>{confirmedShoes}</strong> / {shoePlacements.length} schoenendozen
            </p>
            {nextItem ? (
              <p className="next-item">
                <Target size={15} /> Volgende plaatsing: <strong>{nextItem.id.replace('shoe-', 'Shoe #')}</strong>
              </p>
            ) : (
              <p className="next-item done">
                <CheckCircle2 size={15} /> Schoenendoos blueprint voltooid.
              </p>
            )}
            <div className="guided-actions">
              <button className="ghost-btn" onClick={() => setConfirmedShoes(0)}>
                Reset flow
              </button>
              <button className="solid-btn" onClick={() => setConfirmedShoes((value) => Math.min(value + 1, shoePlacements.length))} disabled={!nextItem}>
                Bevestig plaatsing
              </button>
            </div>
          </div>

          <div className="panel-title-row">
            <h2>Waarom deze lay-out</h2>
          </div>
          <ul className="rationale-list">
            {result.rationale.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>

          <div className="panel-title-row">
            <h2>Operator Instructie</h2>
          </div>
          <ol className="steps">
            {result.steps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

export default App;
