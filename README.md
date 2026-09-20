# Parkflow.

Parkflow is an automated parking guidance system with a web-based dashboard to control and monitor IoT devices, visualize parking occupancy rate and calculate revenue generated. It utilizes TypeScript, React and Vite for the frontend, Python for the backend, Supabase for the database and Docker for containerization.

Developed for Track 2 of the HackMY IoT hackathon (organized by La French Tech Malaysia, MyEvolution, and IEMMSS Monash), the system addresses parking mobility challenges. The track required teams to consume webhooks from a live parking simulation executable via REST APIs to optimize ingress and egress traffic flows. Additionally, the dashboard implements role-based access control (RBAC) to provide distinct access levels for operator and admin roles, allowing them to manually intervene and control IoT devices like lights, exhaust fans and barrier gates. Repair status of these devices is also tracked, to notify the operator in the case of a device breaking down.


<img width="1025" height="527" alt="image" src="https://github.com/user-attachments/assets/988d98ba-7d6e-48f6-aed0-cd74d62e1503" />

<img width="1041" height="541" alt="image" src="https://github.com/user-attachments/assets/6e64b24a-fdd4-40ef-87fe-b8112e226263" />


## Requirements

* Python 3.10+
* uv
* Node.js and npm
* Supabase
* Parking Simulator (not included in this repository)

## Setup

1. Download/unzip the Parking Simulator and place the `ParkingSimulator-win/linux-x64` folder directly at the **repo root** (as a sibling of `backend/` and `frontend/`). It's gitignored, so this step is manual for everyone who clones the repository.

   The backend expects it at exactly this path:
   ```
   HackMY-IoT-Hackathon/
   ├── ParkingSimulator-win-x64/
   │   ├── ParkingSimulator.exe
   │   └── settings/
   │       ├── settings.json
   │       └── lvl1.json
   ├── backend/
   └── frontend/
   ```

2. In `backend/`, copy `.env.example` to `.env` and fill in your Supabase credentials (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`).

3. In `ParkingSimulator-win-x64/settings/settings.json`, set `WebhookUrl` to `http://localhost:8000/webhook`.

4. Run the backend:
   ```
   cd backend
   uv sync
   uv run uvicorn main:app --port 8000 --app-dir src
   ```

5. Run the simulator (`ParkingSimulator.exe`) alongside it.

6. Run the frontend dashboard.
     ```
    cd frontend
    npm install
    npm run dev
     ```
7. Copy and paste the localhost URL or just press `o` and `enter` in the terminal where you ran the frontend to open the webview.


## Repository Structure
```
Directory structure:
└── Hackmy-IoT-Hackathon/
    ├── README.md
    ├── Makefile
    ├── backend/
    │   ├── pyproject.toml
    │   ├── .env.example
    │   ├── scripts/
    │   │   └── cleanup_db.py
    │   └── src/
    │       ├── admin_routes.py
    │       ├── auth.py
    │       ├── config.py
    │       ├── db.py
    │       ├── event_mapping.py
    │       ├── gate_state.py
    │       ├── level_layout.py
    │       ├── main.py
    │       ├── operator_routes.py
    │       ├── simulator_client.py
    │       ├── webhook_security.py
    │       └── ws.py
    └── frontend/
        ├── index.html
        ├── package.json
        ├── vite.config.ts
        ├── .oxlintrc.json
        └── src/
            ├── api.admin.ts
            ├── api.auth.ts
            ├── api.http.ts
            ├── api.operator.ts
            ├── App.tsx
            ├── auth.ts
            ├── AuthContext.tsx
            ├── index.css
            ├── main.tsx
            ├── types.ts
            ├── useEvents.ts
            ├── useTheme.ts
            ├── vite-env.d.ts
            ├── components/
            │   ├── admin/
            │   │   ├── LogTable.tsx
            │   │   ├── OccupancyChart.tsx
            │   │   ├── RevenueChart.tsx
            │   │   └── StatCard.tsx
            │   ├── operator/
            │   │   ├── BarrierCard.tsx
            │   │   ├── CarCard.tsx
            │   │   ├── FanCard.tsx
            │   │   ├── LightCard.tsx
            │   │   ├── PenaltyRow.tsx
            │   │   ├── SpotCard.tsx
            │   │   └── ZoneCard.tsx
            │   └── ui/
            │       ├── Badge.tsx
            │       ├── Button.tsx
            │       └── Card.tsx
            ├── layout/
            │   ├── Shell.tsx
            │   ├── Sidebar.tsx
            │   └── Topbar.tsx
            └── pages/
                ├── AdminDashboard.tsx
                ├── LoginPage.tsx
                └── OperatorDashboard.tsx
```

## Project Structure
```mermaid
flowchart TD

subgraph group_frontend["Frontend Dashboard"]
  node_login_auth["Login Auth<br/>[AuthContext.tsx]"]
  node_operator_dashboard["Operator Dashboard"]
  node_admin_dashboard["Admin Dashboard<br/>[AdminDashboard.tsx]"]
  node_auth_client["Auth Client<br/>[api.auth.ts]"]
  node_operator_client["Operator Client<br/>[api.operator.ts]"]
  node_admin_client["Admin Client<br/>[api.admin.ts]"]
  node_event_hook["Event Hook<br/>[useEvents.ts]"]
end

subgraph group_backend["Backend API"]
  node_backend_api["FastAPI Service<br/>[main.py]"]
  node_auth_service["Auth Service<br/>[auth.py]"]
  node_operator_routes["Operator Routes<br/>[operator_routes.py]"]
  node_admin_routes["Admin Routes<br/>[admin_routes.py]"]
  node_websocket_hub["Websocket Hub<br/>[ws.py]"]
end

subgraph group_domain["Parking Operations"]
  node_event_automation["Event Automation<br/>[main.py]"]
  node_simulator_adapter["Simulator Adapter"]
  node_event_mapping["Event Mapping<br/>[event_mapping.py]"]
  node_gate_state["Gate State<br/>[gate_state.py]"]
end

subgraph group_data["Persistence"]
  node_database[("Visit Database<br/>[db.py]")]
end

node_operator_actor(("Operator User"))
node_admin_actor(("Administrator"))
node_simulator["Parking Simulator"]
node_supabase[("Supabase")]

node_operator_actor -->|"logs in"| node_login_auth
node_admin_actor -->|"logs in"| node_login_auth
node_login_auth -->|"submits credentials"| node_auth_client
node_auth_client -->|"requests auth"| node_backend_api
node_backend_api -->|"authenticates"| node_auth_service
node_backend_api -->|"dispatches requests"| node_operator_routes
node_backend_api -->|"dispatches requests"| node_admin_routes
node_backend_api -->|"dispatches webhooks"| node_event_automation
node_operator_actor -->|"operates parking"| node_operator_dashboard
node_operator_dashboard -->|"loads state"| node_operator_client
node_operator_client -->|"calls controls"| node_operator_routes
node_admin_actor -->|"reviews analytics"| node_admin_dashboard
node_admin_dashboard -->|"loads reports"| node_admin_client
node_admin_client -->|"requests reports"| node_admin_routes
node_operator_dashboard -->|"subscribes events"| node_event_hook
node_event_hook -->|"receives events"| node_websocket_hub
node_websocket_hub -->|"updates display"| node_operator_dashboard
node_simulator -->|"sends webhooks"| node_event_automation
node_event_automation -->|"maps events"| node_event_mapping
node_event_automation -->|"commands simulator"| node_simulator_adapter
node_event_automation -->|"records visits"| node_database
node_event_automation -->|"broadcasts events"| node_websocket_hub
node_event_automation -->|"tracks gates"| node_gate_state
node_operator_routes -->|"controls simulator"| node_simulator_adapter
node_operator_routes -->|"reads visits"| node_database
node_operator_routes -->|"updates gates"| node_gate_state
node_admin_routes -->|"reads history"| node_database
node_admin_routes -->|"reads occupancy"| node_simulator_adapter
node_simulator_adapter -->|"calls simulator"| node_simulator
node_database -->|"persists data"| node_supabase

click node_login_auth "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/AuthContext.tsx"
click node_operator_dashboard "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/pages/OperatorDashboard.tsx"
click node_admin_dashboard "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/pages/AdminDashboard.tsx"
click node_auth_client "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/api.auth.ts"
click node_operator_client "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/api.operator.ts"
click node_admin_client "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/api.admin.ts"
click node_event_hook "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/frontend/src/useEvents.ts"
click node_backend_api "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/main.py"
click node_auth_service "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/auth.py"
click node_operator_routes "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/operator_routes.py"
click node_admin_routes "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/admin_routes.py"
click node_event_automation "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/main.py"
click node_simulator_adapter "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/simulator_client.py"
click node_event_mapping "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/event_mapping.py"
click node_gate_state "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/gate_state.py"
click node_websocket_hub "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/ws.py"
click node_database "https://github.com/vinsongqj/hackmy-iot-hackathon/blob/main/backend/src/db.py"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_login_auth,node_operator_dashboard,node_admin_dashboard,node_auth_client,node_operator_client,node_admin_client,node_event_hook,node_operator_actor toneBlue
class node_backend_api,node_auth_service,node_operator_routes,node_admin_routes,node_websocket_hub,node_supabase toneAmber
class node_event_automation,node_simulator_adapter,node_event_mapping,node_gate_state toneMint
class node_database toneRose
class node_admin_actor,node_simulator toneIndigo
```

## Disclosure of AI Usage

AI was heavily used for this project due to the 30-hour time constraint to complete the hackathon, however, many fixes were also implemented by hand.
