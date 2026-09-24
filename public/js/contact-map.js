document.addEventListener("DOMContentLoaded", () => {
    const mapElement = document.getElementById("africa-map");
    if (!mapElement || typeof L === "undefined") return;

    const map = L.map(mapElement, {
        center: [3, 18],
        zoom: 3,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: false,
        scrollWheelZoom: true,
        worldCopyJump: false,
        maxBounds: [[-40, -25], [38, 55]],
        maxBoundsViscosity: 0.75
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    const litIcon = L.divIcon({ className: "lit-map-marker", html: "<span><i class='bi bi-lightning-charge-fill'></i></span>", iconSize: [42, 42], iconAnchor: [21, 21] });
    L.marker([0.3476, 32.5825], { icon: litIcon }).addTo(map).bindPopup("<strong>LIT Technologies Africa</strong><br>Kampala, Uganda");
});