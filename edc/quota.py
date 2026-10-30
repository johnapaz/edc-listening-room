"""Conservative YouTube quota accounting; always preflight writes."""
from dataclasses import dataclass, field

@dataclass
class Budget:
    remaining_general: int
    remaining_search: int = 50
    maximum_general_per_run: int = 1000
    used_general: int = 0
    used_search: int = 0
    # Optional legacy accounting; current discovery uses the separate search bucket.
    search_general_units: int = 0

    attempts: dict[str, int] = field(default_factory=dict)

    def spend(self, operation: str) -> None:
        if operation == "search.list":
            if self.remaining_search < 1:
                raise RuntimeError("Search quota budget exhausted; no API request made")
            if self.search_general_units:
                if self.remaining_general < self.search_general_units or \
                        self.used_general + self.search_general_units > self.maximum_general_per_run:
                    raise RuntimeError("General quota budget exhausted; no API request made")
                self.remaining_general -= self.search_general_units
                self.used_general += self.search_general_units
            self.attempts[operation] = self.attempts.get(operation, 0) + 1
            self.remaining_search -= 1
            self.used_search += 1
            return
        cost = 50 if operation in ("playlists.insert", "playlistItems.insert", "playlistItems.delete") else 1
        if self.remaining_general < cost or self.used_general + cost > self.maximum_general_per_run:
            raise RuntimeError("General quota budget exhausted; no API request made")
        self.attempts[operation] = self.attempts.get(operation, 0) + 1
        self.remaining_general -= cost
        self.used_general += cost

    def preflight_pilot(self, track_count: int, will_create: bool = True) -> None:
        # Two reads for own playlist discovery and read-back, plus one read per
        # page of existing items (conservatively allocate ten reads).
        estimate = (50 if will_create else 0) + 50 * track_count + 20
        if track_count <= 0 or track_count > 16:
            raise ValueError("Pilot must include 1 to 16 approved tracks")
        if estimate > self.remaining_general or estimate > self.maximum_general_per_run:
            raise RuntimeError("Pilot would exceed the declared quota ceiling")
