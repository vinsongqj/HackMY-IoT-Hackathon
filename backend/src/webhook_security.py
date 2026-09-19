import hashlib


def compute_signature(payload: dict) -> str:
    keys = sorted(k for k in payload if k != "Signature")
    joined = "|".join(str(payload[k]) for k in keys)
    return hashlib.md5(joined.encode()).hexdigest()


def verify_signature(payload: dict) -> bool:
    received = payload.get("Signature")
    if not received:
        return False
    return compute_signature(payload) == received
