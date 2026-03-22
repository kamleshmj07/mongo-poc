<template>
  <div class="layout">
    <!-- TOP BAR -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">HR POC</span>
        <span class="logo-sub">Query Builder</span>
      </div>
      <div class="topbar-token">
        <label>Bearer Token</label>
        <input
          v-model="token"
          type="password"
          placeholder="Paste your bearer token here"
          style="width: 380px"
          @change="saveToken"
        />
        <span v-if="tokenStatus === 'ok'" class="badge badge-green">Valid</span>
        <span v-else-if="tokenStatus === 'err'" class="badge badge-red">Invalid</span>
      </div>
    </header>

    <div class="main">
      <!-- LEFT PANEL -->
      <aside class="sidebar">
        <div class="panel-title">Collections</div>
        <div class="collection-list">
          <button
            v-for="(config, key) in schema"
            :key="key"
            class="collection-btn"
            :class="{ active: selectedCollection === key }"
            @click="selectCollection(key)"
          >
            <span class="col-icon">{{ collectionIcons[key] }}</span>
            <span>{{ config.label }}</span>
          </button>
        </div>

        <div v-if="selectedCollection" class="panel-section">
          <div class="panel-title">Pagination</div>
          <div class="form-row">
            <label>Limit (max 5000)</label>
            <input v-model.number="pagination.limit" type="number" min="1" max="5000" />
          </div>
          <div class="form-row">
            <label>Skip</label>
            <input v-model.number="pagination.skip" type="number" min="0" />
          </div>
        </div>

        <div v-if="selectedCollection" class="panel-section run-section">
          <button class="btn-primary" style="width:100%" :disabled="loading || !token" @click="runQuery">
            {{ loading ? 'Running...' : '▶ Run Query' }}
          </button>
          <div v-if="resultMeta" class="result-meta">
            <span>{{ resultMeta.total.toLocaleString() }} total</span>
            <span>{{ resultMeta.returned }} returned</span>
          </div>
        </div>
      </aside>

      <!-- CENTER PANEL -->
      <div class="center" v-if="selectedCollection">
        <!-- FIELDS -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Fields</span>
            <div class="panel-actions">
              <button class="btn-ghost btn-sm" @click="selectAllFields">All</button>
              <button class="btn-ghost btn-sm" @click="clearFields">None</button>
            </div>
          </div>
          <div class="field-grid">
            <label
              v-for="field in currentSchema.fields"
              :key="field.key"
              class="field-checkbox"
              :class="{ checked: selectedFields.has(field.key) }"
            >
              <input
                type="checkbox"
                :checked="selectedFields.has(field.key)"
                @change="toggleField(field.key)"
              />
              <span class="field-label">{{ field.label }}</span>
              <span class="field-type">{{ field.type }}</span>
            </label>
          </div>
        </div>

        <!-- FILTERS -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Filters</span>
            <button class="btn-ghost btn-sm" @click="clearFilters">Clear</button>
          </div>
          <div class="filter-grid">
            <div v-for="filter in currentSchema.filters" :key="filter.key" class="form-row">
              <label>{{ filter.label }}</label>
              <select v-if="filter.type === 'select'" v-model="activeFilters[filter.key]">
                <option value="">— All —</option>
                <option v-for="opt in filter.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input
                v-else-if="filter.type === 'date'"
                type="date"
                v-model="activeFilters[filter.key]"
              />
              <input
                v-else
                type="text"
                v-model="activeFilters[filter.key]"
                :placeholder="`Filter by ${filter.label.toLowerCase()}...`"
              />
            </div>
          </div>
        </div>

        <!-- API URL -->
        <div class="panel api-url-panel">
          <div class="panel-header">
            <span class="panel-title">API URL</span>
            <button class="btn-ghost btn-sm" @click="copyUrl">{{ copied ? 'Copied!' : 'Copy' }}</button>
          </div>
          <div class="api-url-box">
            <code>{{ computedUrl }}</code>
          </div>
          <div class="api-url-hint">Use this URL in Power BI → Get Data → Web. Set header: <strong>Authorization: Bearer &lt;token&gt;</strong></div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div class="center empty-state" v-else>
        <div class="empty-icon">⬅</div>
        <div class="empty-text">Select a collection to begin</div>
      </div>

      <!-- RIGHT / RESULTS -->
      <div class="results-pane" v-if="results !== null">
        <div class="panel-header" style="padding: 12px 16px; border-bottom: 1px solid var(--border)">
          <span class="panel-title">Results</span>
          <span v-if="resultMeta" class="text-muted" style="font-size:12px">
            Showing {{ resultMeta.returned }} of {{ resultMeta.total.toLocaleString() }}
          </span>
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <div v-else-if="results.length === 0" class="empty-state" style="padding: 40px">
          <div class="empty-text">No results found</div>
        </div>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th v-for="col in resultColumns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in results" :key="i">
                <td v-for="col in resultColumns" :key="col">
                  <span v-if="row[col] === null || row[col] === undefined" class="null-val">—</span>
                  <span v-else-if="typeof row[col] === 'boolean'" :class="row[col] ? 'badge badge-green' : 'badge badge-red'">
                    {{ row[col] }}
                  </span>
                  <span v-else>{{ formatValue(row[col]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';

const API_BASE = '/api';

const token = ref(localStorage.getItem('hrpoc_token') || '');
const tokenStatus = ref('');
const schema = ref({});
const selectedCollection = ref('');
const selectedFields = ref(new Set());
const activeFilters = reactive({});
const pagination = reactive({ limit: 500, skip: 0 });
const results = ref(null);
const resultMeta = ref(null);
const loading = ref(false);
const error = ref('');
const copied = ref(false);

const collectionIcons = {
  employees: '👤',
  onboarding: '📋',
  offboarding: '📤',
  services: '⚙️',
  events: '📡',
};

const currentSchema = computed(() =>
  selectedCollection.value ? schema.value[selectedCollection.value] : null
);

const resultColumns = computed(() => {
  if (!results.value?.length) return [];
  return Object.keys(results.value[0]);
});

const computedUrl = computed(() => {
  if (!selectedCollection.value) return '';
  const params = new URLSearchParams();
  if (selectedFields.value.size > 0) {
    params.set('fields', [...selectedFields.value].join(','));
  }
  for (const [key, val] of Object.entries(activeFilters)) {
    if (val !== '' && val !== null && val !== undefined) params.set(key, val);
  }
  params.set('limit', pagination.limit);
  if (pagination.skip > 0) params.set('skip', pagination.skip);
  const qs = params.toString();
  return `GET http://localhost:3000/api/${selectedCollection.value}${qs ? '?' + qs : ''}`;
});

function saveToken() {
  localStorage.setItem('hrpoc_token', token.value);
  tokenStatus.value = '';
}

async function loadSchema() {
  try {
    const res = await fetch(`${API_BASE}/schema`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    if (!res.ok) { tokenStatus.value = 'err'; return; }
    schema.value = await res.json();
    tokenStatus.value = 'ok';
  } catch {
    tokenStatus.value = 'err';
  }
}

function selectCollection(key) {
  selectedCollection.value = key;
  selectedFields.value = new Set();
  // Reset filters to empty strings for all filter keys
  Object.keys(activeFilters).forEach(k => delete activeFilters[k]);
  if (schema.value[key]) {
    schema.value[key].filters.forEach(f => { activeFilters[f.key] = ''; });
  }
  results.value = null;
  resultMeta.value = null;
  error.value = '';
}

function toggleField(key) {
  const s = new Set(selectedFields.value);
  s.has(key) ? s.delete(key) : s.add(key);
  selectedFields.value = s;
}

function selectAllFields() {
  selectedFields.value = new Set(currentSchema.value.fields.map(f => f.key));
}

function clearFields() {
  selectedFields.value = new Set();
}

function clearFilters() {
  Object.keys(activeFilters).forEach(k => { activeFilters[k] = ''; });
}

async function runQuery() {
  if (!token.value || !selectedCollection.value) return;
  loading.value = true;
  error.value = '';
  results.value = null;
  resultMeta.value = null;

  try {
    const params = new URLSearchParams();
    if (selectedFields.value.size > 0) params.set('fields', [...selectedFields.value].join(','));
    for (const [key, val] of Object.entries(activeFilters)) {
      if (val !== '' && val !== null) params.set(key, val);
    }
    params.set('limit', pagination.limit);
    if (pagination.skip > 0) params.set('skip', pagination.skip);

    const res = await fetch(`${API_BASE}/${selectedCollection.value}?${params}`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });

    const json = await res.json();

    if (!res.ok) {
      error.value = json.error || 'Request failed';
    } else {
      results.value = json.data;
      resultMeta.value = { total: json.total, returned: json.returned };
      tokenStatus.value = 'ok';
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function formatValue(val) {
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'string' && val.length > 60) return val.slice(0, 57) + '...';
  return val;
}

async function copyUrl() {
  const url = computedUrl.value.replace('GET ', '');
  await navigator.clipboard.writeText(url).catch(() => {});
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

watch(token, (val) => {
  if (val) loadSchema();
});

onMounted(() => {
  if (token.value) loadSchema();
});
</script>

<style scoped>
.layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 56px;
  background: var(--surface); border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 10px; }
.logo { font-size: 16px; font-weight: 700; color: var(--accent); }
.logo-sub { color: var(--text-muted); font-size: 13px; }
.topbar-token { display: flex; align-items: center; gap: 10px; }
.topbar-token label { margin: 0; white-space: nowrap; }

.main { display: flex; flex: 1; overflow: hidden; }

/* SIDEBAR */
.sidebar {
  width: 200px; flex-shrink: 0;
  background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow-y: auto; padding-bottom: 16px;
}
.collection-list { display: flex; flex-direction: column; gap: 2px; padding: 8px; }
.collection-btn {
  display: flex; align-items: center; gap: 8px;
  background: transparent; color: var(--text-muted);
  border: 1px solid transparent; border-radius: var(--radius);
  padding: 9px 12px; text-align: left; width: 100%; font-size: 13px;
  transition: all 0.15s;
}
.collection-btn:hover { background: var(--surface2); color: var(--text); }
.collection-btn.active { background: rgba(108,143,255,0.12); border-color: var(--accent); color: var(--accent); }
.col-icon { font-size: 16px; }

.panel-section { padding: 12px; border-top: 1px solid var(--border); }
.run-section { margin-top: auto; border-top: 1px solid var(--border); padding: 12px; }
.result-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--text-muted); }

.panel-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); padding: 12px 12px 6px; }

/* CENTER */
.center { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0; padding: 16px; gap: 12px; }

.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.panel-header .panel-title { padding: 0; }
.panel-actions { display: flex; gap: 6px; }

.field-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 2px; padding: 8px; }
.field-checkbox {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-radius: 6px; cursor: pointer;
  border: 1px solid transparent; transition: all 0.1s;
}
.field-checkbox:hover { background: var(--surface2); }
.field-checkbox.checked { background: rgba(108,143,255,0.08); border-color: rgba(108,143,255,0.3); }
.field-checkbox input { accent-color: var(--accent); width: 14px; height: 14px; flex-shrink: 0; }
.field-label { flex: 1; font-size: 12px; color: var(--text); }
.field-type { font-size: 10px; color: var(--text-muted); background: var(--surface2); padding: 1px 5px; border-radius: 4px; }

.filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; padding: 12px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }

.api-url-panel {}
.api-url-box { padding: 10px 14px; background: var(--bg); }
.api-url-box code { font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 12px; color: var(--accent); word-break: break-all; }
.api-url-hint { padding: 6px 14px 10px; font-size: 11px; color: var(--text-muted); }

/* RESULTS */
.results-pane {
  width: 520px; flex-shrink: 0;
  background: var(--surface); border-left: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden;
}
.table-wrap { overflow: auto; flex: 1; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th {
  position: sticky; top: 0;
  background: var(--surface2); color: var(--text-muted);
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
tbody tr:hover { background: var(--surface2); }
tbody td { padding: 7px 12px; color: var(--text); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.null-val { color: var(--text-muted); }
.text-muted { color: var(--text-muted); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 12px; }
.empty-icon { font-size: 32px; }
.empty-text { color: var(--text-muted); font-size: 14px; }

.error-box { background: rgba(224,92,92,0.1); border: 1px solid var(--red); color: var(--red); padding: 12px 16px; margin: 12px; border-radius: var(--radius); font-size: 13px; }
</style>
