import requests


class SimulatorClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self._token: str | None = None

    def login(self) -> str:
        resp = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"Email": self.username, "Password": self.password},
            timeout=10,
        )
        resp.raise_for_status()
        self._token = resp.json()["token"]
        return self._token

    def _headers(self) -> dict:
        if not self._token:
            self.login()
        return {"Authorization": f"Bearer {self._token}"}

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{path}"
        resp = requests.request(method, url, headers=self._headers(), timeout=10, **kwargs)
        if resp.status_code == 401:
            self.login()
            resp = requests.request(method, url, headers=self._headers(), timeout=10, **kwargs)
        resp.raise_for_status()
        return resp

    def list_parking_spots(self) -> list[dict]:
        return self._request("GET", "/api/v1/list-parking-spots").json()

    def list_barriers(self) -> list[dict]:
        return self._request("GET", "/api/v1/list-barriers").json()

    def list_lights(self) -> list[dict]:
        return self._request("GET", "/api/v1/list-lights").json()

    def list_exhaust_fans(self) -> list[dict]:
        return self._request("GET", "/api/v1/list-exhaust-fans").json()

    def list_alarms(self) -> list[dict]:
        return self._request("GET", "/api/v1/list-alarms").json()

    def list_zones(self) -> list[dict]:
        return self._request("GET", "/api/v1/list-zones").json()

    def trigger_test_webhook(self) -> requests.Response:
        return self._request("GET", "/api/v1/test")

    def open_gate(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/barrier-gates/{name}/open")

    def close_gate(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/barrier-gates/{name}/close")

    def repair_gate(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/barrier-gates/{name}/repair")

    def light_on(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/lights/{name}/on")

    def light_off(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/lights/{name}/off")

    def light_group_on(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/lights/group/{name}/on")

    def light_group_off(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/lights/group/{name}/off")

    def repair_fan(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/exhaust-fans/{name}/repair")

    def fan_on(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/exhaust-fans/{name}/on")

    def fan_off(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/exhaust-fans/{name}/off")

    def repair_spot(self, name: str) -> requests.Response:
        return self._request("POST", f"/api/v1/parking-spots/{name}/repair")

    def car_goto(self, plate: str, destination: str) -> requests.Response:
        return self._request("POST", f"/api/v1/car/{plate}/goto/{destination}")

    def car_charge(self, plate: str, parking_cost: float, charging_cost: float = 0) -> requests.Response:
        return self._request(
            "POST",
            f"/api/v1/car/{plate}/charge",
            params={"parkingCost": parking_cost, "chargingCost": charging_cost},
        )
