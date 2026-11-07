import { createDemo } from './demo-data.mjs';
import { validateSnapshot } from './domain.mjs';
import { normalizeSuppliers } from './suppliers.mjs';
const KEY = 'stockos-v2-demo-1';
export const config = window.STOCKOS_CONFIG || {mode:'demo'};
export const isDemo = config.mode !== 'api';
export async function loadData() {
  if (!isDemo) {
    const response = await fetch(config.snapshotUrl, {headers:{Accept:'application/json'}, signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error(`Não foi possível carregar os dados (HTTP ${response.status}).`);
    return validateSnapshot(normalizeSuppliers(await response.json()));
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return validateSnapshot(normalizeSuppliers(saved));
  } catch { /* Armazenamento indisponível ou incompatível não impede o carregamento da demonstração. */ }
  return normalizeSuppliers(createDemo());
}
export function saveData(data) {
  if (!isDemo) throw new Error('As gravações serão habilitadas com a API de operações.');
  validateSnapshot(data);
  try { localStorage.setItem(KEY,JSON.stringify(data)); return true; } catch { return false; }
}
export function resetDemo() {
  if (!isDemo) throw new Error('A restauração está disponível apenas na demonstração.');
  try { localStorage.removeItem(KEY); } catch {}
  return normalizeSuppliers(createDemo());
}
