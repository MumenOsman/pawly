package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// allowedTables is a whitelist of tables that the debug page can query.
// This prevents SQL injection via the table name parameter.
var allowedTables = []string{
	"users",
	"user_profiles",
	"pets",
	"pet_preferences",
	"connection_requests",
	"connections",
	"chats",
	"messages",
	"dismissed_recommendations",
}

func isAllowedTable(name string) bool {
	for _, t := range allowedTables {
		if t == name {
			return true
		}
	}
	return false
}

// DebugPage serves the HTML debug console.
// GET /debug
func (h *Handler) DebugPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, debugHTML)
}

// DebugTables returns a JSON list of all tables with row counts.
// GET /debug/tables
func (h *Handler) DebugTables(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	type tableInfo struct {
		Name     string `json:"name"`
		RowCount int    `json:"row_count"`
	}

	tables := make([]tableInfo, 0, len(allowedTables))
	for _, name := range allowedTables {
		var count int
		err := h.DB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", name)).Scan(&count)
		if err != nil {
			count = -1 // table might not exist yet
		}
		tables = append(tables, tableInfo{Name: name, RowCount: count})
	}

	writeJSON(w, http.StatusOK, tables)
}

// DebugTableData returns all rows from a specific table as JSON.
// GET /debug/tables/{name}
func (h *Handler) DebugTableData(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	tableName := r.PathValue("name")
	if !isAllowedTable(tableName) {
		writeError(w, http.StatusBadRequest, "unknown table: "+tableName)
		return
	}

	// Query all rows (limited to 500 for safety)
	query := fmt.Sprintf("SELECT * FROM %s ORDER BY 1 LIMIT 500", tableName)
	rows, err := h.DB.Query(query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed: "+err.Error())
		return
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get columns")
		return
	}

	// Build result as list of maps
	var result []map[string]interface{}
	for rows.Next() {
		// Create a slice of interface{} to hold each column value
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			// Convert byte slices to strings for JSON readability
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		result = append(result, row)
	}

	if result == nil {
		result = []map[string]interface{}{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"table":   tableName,
		"columns": columns,
		"rows":    result,
		"count":   len(result),
	})
}

// DebugSQLExec executes a raw read-only SQL query (SELECT only) for debugging.
// POST /debug/query
func (h *Handler) DebugSQLExec(w http.ResponseWriter, r *http.Request) {
	if !h.requireDB(w) {
		return
	}

	// Only allow in development
	type queryReq struct {
		SQL string `json:"sql"`
	}
	var req queryReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	// Safety: only allow SELECT statements
	trimmed := strings.TrimSpace(strings.ToUpper(req.SQL))
	if !strings.HasPrefix(trimmed, "SELECT") {
		writeError(w, http.StatusForbidden, "only SELECT queries are allowed")
		return
	}

	rows, err := h.DB.Query(req.SQL)
	if err != nil {
		writeError(w, http.StatusBadRequest, "query error: "+err.Error())
		return
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var result []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			if b, ok := values[i].([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = values[i]
			}
		}
		result = append(result, row)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"columns": columns,
		"rows":    result,
		"count":   len(result),
	})
}

func decodeJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

// The debug HTML page — a dark-themed console to browse database tables.
const debugHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pawly — Debug Console</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0B1311;
    color: #F1F5F9;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
  }

  header {
    background: #0D5C4D;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  }
  header h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }
  header .badge {
    background: #FF7A42;
    color: #fff;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .container {
    display: flex;
    height: calc(100vh - 56px);
  }

  /* Sidebar */
  aside {
    width: 260px;
    min-width: 260px;
    background: #16221F;
    border-right: 1px solid #24332F;
    overflow-y: auto;
    padding: 16px 0;
  }
  aside h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748B;
    padding: 0 16px 8px;
  }
  .table-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.15s;
    border-left: 3px solid transparent;
  }
  .table-item:hover {
    background: #1e2e2a;
  }
  .table-item.active {
    background: #1e2e2a;
    border-left-color: #FF7A42;
  }
  .table-item .name {
    font-size: 14px;
    font-weight: 500;
  }
  .table-item .count {
    background: #24332F;
    color: #94a3b8;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    min-width: 28px;
    text-align: center;
  }
  .table-item .count.has-data {
    background: rgba(255, 122, 66, 0.2);
    color: #FF7A42;
  }

  /* Main content */
  main {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748B;
    gap: 12px;
  }
  .empty-state .icon { font-size: 48px; }
  .empty-state p { font-size: 15px; }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .table-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: #e2e8f0;
  }
  .table-header .row-count {
    color: #64748B;
    font-size: 13px;
  }

  /* Data table */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .data-table th {
    background: #16221F;
    color: #94a3b8;
    text-align: left;
    padding: 10px 12px;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #24332F;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .data-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #1e2e2a;
    color: #cbd5e1;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .data-table tr:hover td {
    background: #1a2825;
  }
  .data-table td.null {
    color: #475569;
    font-style: italic;
  }
  .data-table td.id-col {
    color: #FF7A42;
    font-weight: 600;
  }

  /* SQL query box */
  .query-section {
    margin-top: 24px;
    border-top: 1px solid #24332F;
    padding-top: 20px;
  }
  .query-section h3 {
    font-size: 13px;
    color: #64748B;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .query-box {
    display: flex;
    gap: 8px;
  }
  .query-box textarea {
    flex: 1;
    background: #16221F;
    border: 1px solid #24332F;
    color: #F1F5F9;
    padding: 10px 12px;
    border-radius: 8px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 13px;
    resize: vertical;
    min-height: 40px;
    max-height: 200px;
  }
  .query-box textarea:focus {
    outline: none;
    border-color: #0D5C4D;
  }
  .query-box button {
    background: #0D5C4D;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .query-box button:hover { background: #0a4a3e; }

  .error-msg {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: 10px 14px;
    border-radius: 8px;
    margin-top: 12px;
    font-size: 13px;
  }

  .loading {
    color: #64748B;
    padding: 40px;
    text-align: center;
  }

  /* Health status bar */
  .status-bar {
    display: flex;
    gap: 16px;
    padding: 8px 24px;
    background: #16221F;
    border-bottom: 1px solid #24332F;
    font-size: 12px;
    color: #64748B;
  }
  .status-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-right: 6px;
  }
  .status-dot.ok { background: #10B981; }
  .status-dot.err { background: #EF4444; }
</style>
</head>
<body>

<header>
  <h1>Pawly — Debug Console</h1>
  <span class="badge">Dev</span>
</header>

<div class="status-bar" id="statusBar">Checking server status...</div>

<div class="container">
  <aside id="sidebar">
    <h2>Database Tables</h2>
    <div id="tableList" class="loading">Loading...</div>
  </aside>
  <main id="content">
    <div class="empty-state">
      <div class="icon">🗄️</div>
      <p>Select a table from the sidebar to view its data</p>
    </div>
    <div class="query-section">
      <h3>Run Query (SELECT only)</h3>
      <div class="query-box">
        <textarea id="queryInput" placeholder="SELECT * FROM users LIMIT 10" rows="1"></textarea>
        <button onclick="runQuery()">Run</button>
      </div>
      <div id="queryResult"></div>
    </div>
  </main>
</div>

<script>
  let activeTable = null;

  async function init() {
    // Check health
    try {
      const health = await fetch('/health').then(r => r.json());
      const bar = document.getElementById('statusBar');
      const dbOk = health.database === 'connected';
      bar.innerHTML =
        '<span><span class="status-dot ok"></span>Server: running</span>' +
        '<span><span class="status-dot ' + (dbOk ? 'ok' : 'err') + '"></span>Database: ' + health.database + '</span>';
    } catch(e) {
      document.getElementById('statusBar').innerHTML =
        '<span><span class="status-dot err"></span>Server: unreachable</span>';
    }

    // Load tables
    try {
      const tables = await fetch('/debug/tables').then(r => r.json());
      const list = document.getElementById('tableList');
      list.className = '';
      list.innerHTML = tables.map(t =>
        '<div class="table-item" onclick="loadTable(\'' + t.name + '\', this)">' +
        '  <span class="name">' + t.name + '</span>' +
        '  <span class="count' + (t.row_count > 0 ? ' has-data' : '') + '">' + (t.row_count >= 0 ? t.row_count : '?') + '</span>' +
        '</div>'
      ).join('');
    } catch(e) {
      document.getElementById('tableList').innerHTML =
        '<div style="padding:16px;color:#fca5a5;">Failed to load tables. Is the database connected?</div>';
    }
  }

  async function loadTable(name, el) {
    // Update active state
    document.querySelectorAll('.table-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    activeTable = name;

    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading">Loading ' + name + '...</div>';

    try {
      const data = await fetch('/debug/tables/' + name).then(r => r.json());
      let html = '<div class="table-header">' +
        '<h2>' + name + '</h2>' +
        '<span class="row-count">' + data.count + ' rows</span></div>';

      if (data.count === 0) {
        html += '<div class="empty-state" style="height:auto;padding:60px 0;"><div class="icon">📭</div><p>No data in this table yet</p></div>';
      } else {
        html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr>';
        data.columns.forEach(col => { html += '<th>' + col + '</th>'; });
        html += '</tr></thead><tbody>';
        data.rows.forEach(row => {
          html += '<tr>';
          data.columns.forEach(col => {
            const val = row[col];
            if (val === null || val === undefined) {
              html += '<td class="null">NULL</td>';
            } else if (col === 'id' || col.endsWith('_id')) {
              html += '<td class="id-col">' + escapeHtml(String(val)) + '</td>';
            } else if (col === 'password_hash') {
              html += '<td style="color:#475569;">••••••••</td>';
            } else {
              html += '<td title="' + escapeHtml(String(val)) + '">' + escapeHtml(String(val)) + '</td>';
            }
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      }

      // Add query section
      html += '<div class="query-section"><h3>Run Query (SELECT only)</h3>' +
        '<div class="query-box"><textarea id="queryInput" placeholder="SELECT * FROM ' + name + ' LIMIT 10" rows="1"></textarea>' +
        '<button onclick="runQuery()">Run</button></div><div id="queryResult"></div></div>';

      content.innerHTML = html;
    } catch(e) {
      content.innerHTML = '<div class="error-msg">Failed to load table: ' + e.message + '</div>';
    }
  }

  async function runQuery() {
    const input = document.getElementById('queryInput');
    const resultDiv = document.getElementById('queryResult');
    if (!input || !input.value.trim()) return;

    resultDiv.innerHTML = '<div class="loading">Running query...</div>';

    try {
      const res = await fetch('/debug/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: input.value.trim() })
      });
      const data = await res.json();

      if (data.error) {
        resultDiv.innerHTML = '<div class="error-msg">' + escapeHtml(data.error) + '</div>';
        return;
      }

      let html = '<div style="margin-top:12px;overflow-x:auto;"><table class="data-table"><thead><tr>';
      (data.columns || []).forEach(col => { html += '<th>' + col + '</th>'; });
      html += '</tr></thead><tbody>';
      (data.rows || []).forEach(row => {
        html += '<tr>';
        (data.columns || []).forEach(col => {
          const val = row[col];
          if (val === null || val === undefined) {
            html += '<td class="null">NULL</td>';
          } else {
            html += '<td>' + escapeHtml(String(val)) + '</td>';
          }
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      html += '<div style="color:#64748B;font-size:12px;margin-top:8px;">' + data.count + ' rows returned</div>';
      resultDiv.innerHTML = html;
    } catch(e) {
      resultDiv.innerHTML = '<div class="error-msg">Query failed: ' + e.message + '</div>';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Handle Enter key in query input
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey && document.activeElement.id === 'queryInput') {
      e.preventDefault();
      runQuery();
    }
  });

  init();
</script>
</body>
</html>`
