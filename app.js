(function () {
  const locations = Array.isArray(window.LOCATION_GUESSER_LOCATIONS)
    ? window.LOCATION_GUESSER_LOCATIONS
    : [];
  const openRounds = Array.isArray(window.LOCATION_GUESSER_OPEN_ROUNDS)
    ? window.LOCATION_GUESSER_OPEN_ROUNDS
    : [];
  const emergencyOpenRounds = [
    {
      name: "Nahe Darmstadt, Deutschland",
      lat: 49.7901595,
      lng: 8.6493507,
      imageKey: "683452496997264",
    },
    {
      name: "Nagano-Region, Japan",
      lat: 36.3096744,
      lng: 138.4362083,
      imageKey: "Cuyq9l9YI5HF3In1C7f8aj",
    },
  ];

  const elements = {
    pano: document.getElementById("pano"),
    map: document.getElementById("map"),
    panoStatus: document.getElementById("pano-status"),
    roundValue: document.getElementById("round-value"),
    scoreValue: document.getElementById("score-value"),
    submitButton: document.getElementById("submit-button"),
    resetGuessButton: document.getElementById("reset-guess-button"),
    newRoundButton: document.getElementById("new-round-button"),
    resultPanel: document.getElementById("result-panel"),
    resultSummary: document.getElementById("result-summary"),
    resultDistance: document.getElementById("result-distance"),
    zoomInButton: document.getElementById("zoom-in-button"),
    zoomOutButton: document.getElementById("zoom-out-button"),
    zoomResetButton: document.getElementById("zoom-reset-button"),
    leaderboardList: document.getElementById("leaderboard-list"),
    clearLeaderboardButton: document.getElementById("clear-leaderboard-button"),
  };

  const LEADERBOARD_STORAGE_KEY = "location-guesser-best-guesses-v1";
  const OPEN_SEEN_IMAGE_KEYS_STORAGE_KEY = "location-guesser-seen-open-images-v2";
  const MAX_PERSISTED_OPEN_IMAGE_KEYS = 5000;
  const MAX_OPEN_IMAGE_KEYS_PER_REQUEST = 1200;

  const state = {
    provider: "open",
    round: 1,
    totalScore: 0,
    currentLocation: null,
    guessLatLng: null,
    mapAdapter: null,
    config: {},
    availableGoogleLocations: [],
    availableOpenRounds: [],
    importedOpenRounds: [],
    pendingOpenRounds: [],
    lastOpenRoundMeta: null,
    seenOpenImageKeys: [],
    recentOpenImageKeys: [],
    recentOpenRegions: [],
    openViewer: null,
    openViewerZoom: 0.9,
    leaderboard: [],
  };

  function setStatus(message, isError) {
    elements.panoStatus.textContent = message;
    elements.panoStatus.classList.toggle("error", Boolean(isError));
  }

  function updateScoreboard() {
    elements.roundValue.textContent = String(state.round);
    elements.scoreValue.textContent = String(state.totalScore);
  }

  function initialize() {
    loadRuntimeConfig()
      .then(function (config) {
        state.config = config;
        state.provider = config.provider || "open";

        if (state.provider === "google") {
          if (!locations.length) {
            throw new Error("missing-google-locations");
          }
          if (!config.googleMapsApiKey || config.googleMapsApiKey.includes("PUT_YOUR")) {
            throw new Error("missing-google-api-key");
          }

          return loadGoogleMapsScript(config.googleMapsApiKey).then(function () {
            setupGoogleMode(config);
          });
        }

        return loadOpenAssets(config).then(function () {
          setupOpenMode();
        });
      })
      .catch(function (error) {
        const message = getStartupErrorMessage(error);
        setStatus(message, true);
      });
  }

  function loadRuntimeConfig() {
    return fetch("./api/runtime-config")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("config-fetch-failed");
        }

        return response.json();
      })
      .catch(function () {
        return Promise.resolve(window.LOCATION_GUESSER_CONFIG || {});
      })
      .then(function (remoteConfig) {
        const localConfig = window.LOCATION_GUESSER_CONFIG || {};
        const mergedConfig = Object.assign({}, localConfig);

        Object.keys(remoteConfig || {}).forEach(function (key) {
          if (remoteConfig[key] !== "") {
            mergedConfig[key] = remoteConfig[key];
          }
        });

        return mergedConfig;
      });
  }

  function getStartupErrorMessage(error) {
    if (error && error.message === "missing-google-api-key") {
      return "Google-Modus aktiv, aber kein Google Maps API-Key konfiguriert.";
    }
    if (error && error.message === "missing-google-locations") {
      return "Google-Modus aktiv, aber locations.js ist leer.";
    }
    return "Die Spielansicht konnte nicht geladen werden. Pruefe die Konfiguration.";
  }


  function loadLocalOpenRoundPool() {
    return fetch("./mapillary_image_pool.json", {
      cache: "no-store",
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("local-open-pool-fetch-failed");
        }
        return response.json();
      })
      .then(function (payload) {
        if (!Array.isArray(payload)) {
          throw new Error("local-open-pool-invalid");
        }

        state.importedOpenRounds = payload.filter(function (item) {
          return item && item.imageKey && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));
        });
      });
  }
  function loadOpenAssets(config) {
    const tasks = [];

    ensureStylesheet("leaflet-css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    tasks.push(loadScriptOnce("leaflet-js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"));

    return Promise.all(tasks);
  }

  function ensureStylesheet(id, href) {
    if (document.getElementById(id)) {
      return;
    }

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScriptOnce(id, src) {
    if (document.getElementById(id)) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.id = id;
      script.async = true;
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function setupOpenMode() {
    state.mapAdapter = createLeafletAdapter();

    state.mapAdapter.initialize(elements.map, function (latLng) {
      placeGuess(latLng);
    });

    elements.submitButton.addEventListener("click", submitGuess);
    elements.resetGuessButton.addEventListener("click", resetGuessMarker);
    elements.newRoundButton.addEventListener("click", startRound);
    elements.zoomInButton.addEventListener("click", function () {
      adjustOpenViewerZoom(0.35);
    });
    elements.zoomOutButton.addEventListener("click", function () {
      adjustOpenViewerZoom(-0.35);
    });
    elements.zoomResetButton.addEventListener("click", resetOpenViewerZoom);
    elements.clearLeaderboardButton.addEventListener("click", clearLeaderboard);
    elements.zoomInButton.disabled = false;
    elements.zoomOutButton.disabled = false;
    elements.zoomResetButton.disabled = false;

    state.leaderboard = loadLeaderboard();
    state.seenOpenImageKeys = loadSeenOpenImageKeys();
    renderLeaderboard();
    updateScoreboard();
    setStatus("Open-Modus aktiv. Lade lokalen Bildpool ...", false);
    loadLocalOpenRoundPool()
      .catch(function () {
        return Promise.resolve();
      })
      .then(function () {
        setStatus("Open-Modus aktiv: OpenStreetMap + Mapillary.", false);
        startRound();
      });
  }

  function createLeafletAdapter() {
    let map = null;
    let guessMarker = null;
    let actualMarker = null;
    let resultLine = null;

    return {
      initialize: function (container, onGuessClick) {
        map = L.map(container, {
          center: [20, 0],
          zoom: 2,
          worldCopyJump: true,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        map.on("click", function (event) {
          onGuessClick({
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          });
        });
      },
      resetView: function () {
        if (guessMarker) {
          map.removeLayer(guessMarker);
          guessMarker = null;
        }
        if (actualMarker) {
          map.removeLayer(actualMarker);
          actualMarker = null;
        }
        if (resultLine) {
          map.removeLayer(resultLine);
          resultLine = null;
        }
        map.setView([20, 0], 2);
      },
      setGuessMarker: function (latLng) {
        if (!guessMarker) {
          guessMarker = L.circleMarker([latLng.lat, latLng.lng], {
            radius: 9,
            color: "#fff4e8",
            weight: 2,
            fillColor: "#53d8a5",
            fillOpacity: 1,
          }).addTo(map);
          return;
        }
        guessMarker.setLatLng([latLng.lat, latLng.lng]).addTo(map);
      },
      clearGuessMarker: function () {
        if (guessMarker) {
          map.removeLayer(guessMarker);
          guessMarker = null;
        }
      },
      showResult: function (guessLatLng, actualLatLng) {
        actualMarker = L.circleMarker([actualLatLng.lat, actualLatLng.lng], {
          radius: 8,
          color: "#fff4e8",
          weight: 2,
          fillColor: "#ff6b35",
          fillOpacity: 1,
        }).addTo(map);

        resultLine = L.polyline(
          [
            [guessLatLng.lat, guessLatLng.lng],
            [actualLatLng.lat, actualLatLng.lng],
          ],
          {
            color: "#ffd166",
            weight: 3,
          }
        ).addTo(map);

        map.fitBounds(resultLine.getBounds(), { padding: [40, 40] });
      },
    };
  }

  function setupGoogleMode(config) {
    state.mapAdapter = createGoogleAdapter(config);

    state.mapAdapter.initialize(elements.map, elements.pano, function (latLng) {
      placeGuess(latLng);
    });

    elements.submitButton.addEventListener("click", submitGuess);
    elements.resetGuessButton.addEventListener("click", resetGuessMarker);
    elements.newRoundButton.addEventListener("click", startRound);
    elements.zoomInButton.disabled = true;
    elements.zoomOutButton.disabled = true;
    elements.zoomResetButton.disabled = true;
    elements.clearLeaderboardButton.addEventListener("click", clearLeaderboard);

    state.leaderboard = loadLeaderboard();
    renderLeaderboard();
    setStatus("Google-Modus aktiv: Maps + Street View.", false);
    updateScoreboard();
    startRound();
  }

  function createGoogleAdapter(config) {
    let map = null;
    let panorama = null;
    let streetViewService = null;
    let guessMarker = null;
    let actualMarker = null;
    let resultLine = null;

    return {
      initialize: function (mapContainer, panoContainer, onGuessClick) {
        streetViewService = new google.maps.StreetViewService();
        map = new google.maps.Map(mapContainer, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          streetViewControl: false,
          mapTypeControl: true,
          mapTypeId: "roadmap",
          fullscreenControl: false,
          mapId: config.mapId || undefined,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });

        panorama = new google.maps.StreetViewPanorama(panoContainer, {
          addressControl: false,
          fullscreenControl: false,
          linksControl: true,
          motionTracking: false,
          showRoadLabels: false,
          disableDefaultUI: false,
        });

        map.addListener("click", function (event) {
          onGuessClick({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        });
      },
      resetView: function () {
        if (guessMarker) {
          guessMarker.setMap(null);
          guessMarker = null;
        }
        if (actualMarker) {
          actualMarker.setMap(null);
          actualMarker = null;
        }
        if (resultLine) {
          resultLine.setMap(null);
          resultLine = null;
        }
        map.setCenter({ lat: 20, lng: 0 });
        map.setZoom(2);
      },
      setGuessMarker: function (latLng) {
        if (!guessMarker) {
          guessMarker = new google.maps.Marker({
            position: latLng,
            map: map,
            title: "Dein Guess",
          });
          return;
        }
        guessMarker.setPosition(latLng);
        guessMarker.setMap(map);
      },
      clearGuessMarker: function () {
        if (guessMarker) {
          guessMarker.setMap(null);
          guessMarker = null;
        }
      },
      showResult: function (guessLatLng, actualLatLng) {
        actualMarker = new google.maps.Marker({
          position: actualLatLng,
          map: map,
          title: "Tatsaechlicher Ort",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#ff6b35",
            fillOpacity: 1,
            strokeColor: "#fff4e8",
            strokeWeight: 2,
          },
        });

        resultLine = new google.maps.Polyline({
          path: [guessLatLng, actualLatLng],
          geodesic: true,
          strokeColor: "#ffd166",
          strokeOpacity: 1,
          strokeWeight: 3,
          map: map,
        });

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(guessLatLng);
        bounds.extend(actualLatLng);
        map.fitBounds(bounds, 80);
      },
      loadRound: function (location, onSuccess, onError, attempt) {
        const candidate = jitterLatLng(location);
        streetViewService.getPanorama(
          {
            location: candidate,
            radius: location.radiusMeters,
            preference: google.maps.StreetViewPreference.NEAREST,
            source: google.maps.StreetViewSource.OUTDOOR,
          },
          function (data, status) {
            if (status === google.maps.StreetViewStatus.OK) {
              const actualLatLng = {
                lat: data.location.latLng.lat(),
                lng: data.location.latLng.lng(),
              };

              panorama.setPano(data.location.pano);
              panorama.setPov({
                heading: Math.random() * 360,
                pitch: -4 + Math.random() * 8,
              });
              panorama.setZoom(0);

              onSuccess({
                mode: "google",
                name: location.name,
                latLng: actualLatLng,
              });
              return;
            }

            if (attempt < 7) {
              onError("retry");
              return;
            }

            onError("failed");
          }
        );
      },
    };
  }

  function startRound() {
    clearRoundState();
    setStatus("Lade neue Runde ...", false);

    if (state.provider === "google") {
      const location = takeNextRound(locations, "availableGoogleLocations");
      state.mapAdapter.loadRound(
        location,
        function (resolvedLocation) {
          state.currentLocation = resolvedLocation;
          setStatus("Ort geladen. Setze deinen Guess auf der Karte.", false);
        },
        function (reason) {
          if (reason === "retry") {
            startGoogleRetry(location, 1);
            return;
          }
          setStatus("Fuer diesen Ort wurde kein Street View gefunden. Starte eine neue Runde.", true);
        },
        0
      );
      return;
    }

    loadOpenRound()
      .then(function (round) {
        state.currentLocation = round;
        rememberOpenImageKey(round.imageKey);
        rememberOpenRegion(round.region);
        resetOpenViewerZoom();
        renderOpenViewer(state.currentLocation);
        setStatus(
          buildOpenRoundStatus(round),
          false
        );
      })
      .catch(function () {
        const emergencyRound = getEmergencyOpenRound();
        state.currentLocation = emergencyRound;
        rememberOpenImageKey(emergencyRound.imageKey);
        rememberOpenRegion(emergencyRound.region);
        resetOpenViewerZoom();
        renderOpenViewer(state.currentLocation);
        setStatus(buildOpenFallbackStatus(), false);
      });
  }

  function startGoogleRetry(location, attempt) {
    state.mapAdapter.loadRound(
      location,
      function (resolvedLocation) {
        state.currentLocation = resolvedLocation;
        setStatus("Ort geladen. Setze deinen Guess auf der Karte.", false);
      },
      function (reason) {
        if (reason === "retry" && attempt < 7) {
          startGoogleRetry(location, attempt + 1);
          return;
        }
        setStatus("Fuer diesen Ort wurde kein Street View gefunden. Starte eine neue Runde.", true);
      },
      attempt
    );
  }

  function clearRoundState() {
    state.currentLocation = null;
    state.guessLatLng = null;
    elements.resultPanel.classList.add("hidden");
    elements.submitButton.disabled = true;
    elements.resetGuessButton.disabled = true;
    if (state.provider === "open" && !state.openViewer) {
      elements.pano.innerHTML = "";
    }
    if (state.mapAdapter) {
      state.mapAdapter.resetView();
    }
  }

  function renderOpenViewer(location) {
    elements.zoomInButton.disabled = true;
    elements.zoomOutButton.disabled = true;
    elements.zoomResetButton.disabled = true;

    elements.pano.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.className = "viewer-frame";
    iframe.src = "https://www.mapillary.com/embed?image_key=" + encodeURIComponent(location.imageKey);
    iframe.title = "Mapillary Ansicht";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    iframe.addEventListener("error", function () {
      renderOpenFallbackLink(location);
    });

    const credit = document.createElement("p");
    credit.className = "viewer-credit";
    credit.innerHTML =
      '<a href="' +
      escapeHtml(location.sourceUrl) +
      '" target="_blank" rel="noreferrer">Quelle: ' +
      escapeHtml(location.attribution) +
      "</a> (" +
      escapeHtml(location.license) +
      ")";

    elements.pano.appendChild(iframe);
    elements.pano.appendChild(credit);
  }

  function renderOpenFallbackLink(location) {
    elements.zoomInButton.disabled = true;
    elements.zoomOutButton.disabled = true;
    elements.zoomResetButton.disabled = true;
    elements.pano.innerHTML =
      '<div class="viewer-fallback">' +
      "<p>Die interaktive Mapillary-Ansicht konnte nicht geladen werden. Zoom ist in diesem Fallback nicht verfuegbar.</p>" +
      '<p><a href="' +
      escapeHtml(location.sourceUrl || "https://www.mapillary.com/app/") +
      '" target="_blank" rel="noreferrer">Bild direkt bei Mapillary oeffnen</a></p>' +
      "</div>";
  }

  function buildOpenRoundStatus(round) {
    const parts = ["Open-Runde geladen"];
    if (round.region) {
      parts.push("(" + round.region + ")");
    }
    if (state.lastOpenRoundMeta && state.lastOpenRoundMeta.source) {
      parts.push("- Quelle: " + state.lastOpenRoundMeta.source);
    }
    if (state.lastOpenRoundMeta && state.lastOpenRoundMeta.candidateCount) {
      parts.push("- Kandidaten: " + state.lastOpenRoundMeta.candidateCount);
    }
    parts.push(". Setze deinen Guess auf der Karte.");
    return parts.join(" ");
  }

  function buildOpenApiErrorMessage() {
    const meta = state.lastOpenRoundMeta || {};
    const reason = meta.reason ? " Grund: " + meta.reason + "." : "";
    const source = meta.source ? " Quelle: " + meta.source + "." : "";
    return "Die Mapillary-API liefert aktuell keine spielbare Zufallsrunde." + source + reason;
  }

  function buildOpenFallbackStatus() {
    if (state.config.hasMapillaryAccessToken) {
      return buildOpenApiErrorMessage() + " Lokale Fallback-Runde geladen.";
    }

    return "Fallback-Runde geladen. Setze deinen Guess auf der Karte.";
  }

  function placeGuess(latLng) {
    state.guessLatLng = latLng;
    state.mapAdapter.setGuessMarker(latLng);
    elements.submitButton.disabled = false;
    elements.resetGuessButton.disabled = false;
  }

  function resetGuessMarker() {
    state.guessLatLng = null;
    state.mapAdapter.clearGuessMarker();
    elements.submitButton.disabled = true;
    elements.resetGuessButton.disabled = true;
  }

  function submitGuess() {
    if (!state.guessLatLng || !state.currentLocation) {
      return;
    }

    const distanceMeters = haversineDistance(state.guessLatLng, state.currentLocation.latLng);
    const roundScore = calculateScore(distanceMeters);
    state.totalScore += roundScore;
    updateScoreboard();

    state.mapAdapter.showResult(state.guessLatLng, state.currentLocation.latLng);

    elements.resultSummary.textContent =
      "Du warst " + formatDistance(distanceMeters) + " entfernt und bekommst " + roundScore + " Punkte.";
    elements.resultDistance.textContent =
      "Gesuchter Ort: " + state.currentLocation.name + ". Koordinaten: " +
      state.currentLocation.latLng.lat.toFixed(4) +
      ", " +
      state.currentLocation.latLng.lng.toFixed(4) +
      ".";
    elements.resultPanel.classList.remove("hidden");
    pushLeaderboardEntry({
      locationName: state.currentLocation.name,
      region: state.currentLocation.region || "",
      distanceMeters: distanceMeters,
      score: roundScore,
      guessedAt: new Date().toISOString(),
    });

    state.round += 1;
    elements.roundValue.textContent = String(state.round);
    elements.submitButton.disabled = true;
  }

  function adjustOpenViewerZoom(delta) {
    if (!state.openViewer || typeof state.openViewer.setZoom !== "function") {
      return;
    }

    state.openViewerZoom = clamp(state.openViewerZoom + delta, 0.2, 3.5);
    state.openViewer.setZoom(state.openViewerZoom);
  }

  function resetOpenViewerZoom() {
    state.openViewerZoom = 1;
    if (state.openViewer && typeof state.openViewer.setZoom === "function") {
      state.openViewer.setZoom(state.openViewerZoom);
    }
  }

  function pickRandomItem(items) {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  function loadOpenRound(attempt) {
    const requestAttempt = attempt || 0;
    if (state.importedOpenRounds.length) {
      state.lastOpenRoundMeta = { source: "local-pool", reason: "", candidateCount: state.importedOpenRounds.length };
      return Promise.resolve(normalizeOpenRound(getLocalFallbackRound()));
    }
    if (state.pendingOpenRounds.length) {
      return Promise.resolve(state.pendingOpenRounds.pop());
    }

    return refillOpenRoundPool(requestAttempt).then(function () {
      if (state.pendingOpenRounds.length) {
        return state.pendingOpenRounds.pop();
      }

      throw new Error("open-round-pool-empty");
    });
  }

  function refillOpenRoundPool(attempt) {
    const requestAttempt = attempt || 0;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(function () {
      controller.abort();
    }, 9000);
    const excludeImageKeys = dedupeStrings(
      state.recentOpenImageKeys.concat(state.seenOpenImageKeys.slice(-MAX_OPEN_IMAGE_KEYS_PER_REQUEST))
    );
    const excludeRegions = dedupeStrings(state.recentOpenRegions.slice(-24));

    return fetch("./api/open-round", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        excludeImageKeys: excludeImageKeys,
        excludeRegions: excludeRegions,
        count: 60,
      }),
      signal: controller.signal,
    })
      .then(function (response) {
        window.clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error("open-round-fetch-failed");
        }
        return response.json();
      })
      .then(function (payload) {
        state.lastOpenRoundMeta = {
          source: payload && payload.source ? payload.source : "",
          reason: payload && payload.reason ? payload.reason : "",
          candidateCount: payload && payload.candidateCount ? payload.candidateCount : 0,
        };

        if (payload && Array.isArray(payload.rounds) && payload.rounds.length) {
          const rounds = payload.rounds
            .map(normalizeOpenRound)
            .filter(function (round) {
              return (
                round &&
                round.imageKey &&
                state.seenOpenImageKeys.indexOf(round.imageKey) === -1 &&
                state.recentOpenImageKeys.indexOf(round.imageKey) === -1
              );
            });

          if (rounds.length) {
            state.pendingOpenRounds = shuffle(rounds.slice());
            return;
          }
        }

        if (payload && payload.round && payload.round.imageKey) {
          const singleRound = normalizeOpenRound(payload.round);
          if (
            singleRound &&
            state.seenOpenImageKeys.indexOf(singleRound.imageKey) === -1 &&
            state.recentOpenImageKeys.indexOf(singleRound.imageKey) === -1
          ) {
            state.pendingOpenRounds = [singleRound];
            return;
          }
        }

        if (requestAttempt < 4) {
          return refillOpenRoundPool(requestAttempt + 1);
        }

        throw new Error("open-round-missing");
      })
      .catch(function (error) {
        window.clearTimeout(timeoutId);
        if (requestAttempt < 2) {
          return refillOpenRoundPool(requestAttempt + 1);
        }

        if (state.config.hasMapillaryAccessToken) {
          throw error || new Error("open-round-api-unavailable");
        }

        state.pendingOpenRounds = [normalizeOpenRound(getLocalFallbackRound())];
        return Promise.resolve();
      });
  }

  function getLocalFallbackRound() {
    const poolSource = state.importedOpenRounds.length
      ? state.importedOpenRounds
      : openRounds.length
        ? openRounds
        : emergencyOpenRounds;
    const filtered = poolSource.filter(function (item) {
      return (
        state.recentOpenImageKeys.indexOf(item.imageKey) === -1 &&
        state.seenOpenImageKeys.indexOf(item.imageKey) === -1
      );
    });
    const pool = filtered.length ? filtered : poolSource;
    const round = takeNextRound(pool, "availableOpenRounds");
    return round || emergencyOpenRounds[0];
  }

  function getEmergencyOpenRound() {
    return normalizeOpenRound(getLocalFallbackRound());
  }

  function normalizeOpenRound(round) {
    return {
      mode: "open",
      name: round.name,
      latLng: { lat: Number(round.lat), lng: Number(round.lng) },
      imageKey: round.imageKey,
      imageUrl: round.imageUrl || ("https://www.mapillary.com/app/?pKey=" + encodeURIComponent(round.imageKey)),
      sourceUrl: round.sourceUrl || ("https://www.mapillary.com/app/?pKey=" + encodeURIComponent(round.imageKey)),
      attribution: round.attribution || "Mapillary imagery",
      license: round.license || "CC BY-SA",
      region: round.region || "",
    };
  }

  function rememberOpenImageKey(imageKey) {
    if (!imageKey) {
      return;
    }

    state.recentOpenImageKeys.push(imageKey);
    if (state.recentOpenImageKeys.length > 160) {
      state.recentOpenImageKeys = state.recentOpenImageKeys.slice(-160);
    }

    if (state.seenOpenImageKeys.indexOf(imageKey) === -1) {
      state.seenOpenImageKeys.push(imageKey);
      if (state.seenOpenImageKeys.length > MAX_PERSISTED_OPEN_IMAGE_KEYS) {
        state.seenOpenImageKeys = state.seenOpenImageKeys.slice(-MAX_PERSISTED_OPEN_IMAGE_KEYS);
      }
      saveSeenOpenImageKeys();
    }
  }

  function rememberOpenRegion(region) {
    if (!region) {
      return;
    }

    state.recentOpenRegions.push(region);
    if (state.recentOpenRegions.length > 12) {
      state.recentOpenRegions = state.recentOpenRegions.slice(-12);
    }
  }

  function loadLeaderboard() {
    try {
      const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function loadSeenOpenImageKeys() {
    try {
      const raw = window.localStorage.getItem(OPEN_SEEN_IMAGE_KEYS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_error) {
      return [];
    }
  }

  function saveSeenOpenImageKeys() {
    try {
      window.localStorage.setItem(
        OPEN_SEEN_IMAGE_KEYS_STORAGE_KEY,
        JSON.stringify(state.seenOpenImageKeys.slice(-MAX_PERSISTED_OPEN_IMAGE_KEYS))
      );
    } catch (_error) {
      // Ignore storage errors and keep gameplay running.
    }
  }

  function saveLeaderboard() {
    try {
      window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(state.leaderboard));
    } catch (_error) {
      // Ignore storage errors and keep gameplay running.
    }
  }

  function pushLeaderboardEntry(entry) {
    state.leaderboard.push(entry);
    state.leaderboard.sort(function (left, right) {
      if (left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters;
      }
      return right.score - left.score;
    });
    state.leaderboard = state.leaderboard.slice(0, 10);
    saveLeaderboard();
    renderLeaderboard();
  }

  function clearLeaderboard() {
    state.leaderboard = [];
    saveLeaderboard();
    renderLeaderboard();
  }

  function renderLeaderboard() {
    if (!elements.leaderboardList) {
      return;
    }

    elements.leaderboardList.innerHTML = "";

    if (!state.leaderboard.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "leaderboard-empty";
      emptyItem.textContent = "Noch keine Guesses gespeichert.";
      elements.leaderboardList.appendChild(emptyItem);
      return;
    }

    state.leaderboard.forEach(function (entry) {
      const item = document.createElement("li");
      item.textContent =
        formatDistance(entry.distanceMeters) +
        " | " +
        entry.score +
        " Punkte | " +
        entry.locationName +
        (entry.region ? " (" + entry.region + ")" : "");
      elements.leaderboardList.appendChild(item);
    });
  }

  function takeNextRound(sourceItems, stateKey) {
    if (!Array.isArray(state[stateKey]) || state[stateKey].length === 0) {
      state[stateKey] = shuffle(sourceItems.slice());
    }

    return state[stateKey].pop();
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = items[index];
      items[index] = items[swapIndex];
      items[swapIndex] = current;
    }

    return items;
  }

  function dedupeStrings(values) {
    const seen = Object.create(null);
    return values.filter(function (value) {
      if (!value || seen[value]) {
        return false;
      }
      seen[value] = true;
      return true;
    });
  }

  function jitterLatLng(location) {
    return {
      lat: location.lat + (Math.random() - 0.5) * 0.08,
      lng: location.lng + (Math.random() - 0.5) * 0.08,
    };
  }

  function loadGoogleMapsScript(apiKey) {
    if (window.google && window.google.maps) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      const callbackName = "__locationGuesserInit";
      window[callbackName] = function () {
        delete window[callbackName];
        resolve();
      };

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&callback=" +
        callbackName;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function calculateScore(distanceMeters) {
    const maxScore = 5000;
    const scaled = Math.exp(-distanceMeters / 2200000);
    return Math.max(0, Math.round(maxScore * scaled));
  }

  function formatDistance(distanceMeters) {
    if (distanceMeters < 1000) {
      return Math.round(distanceMeters) + " m";
    }
    return (distanceMeters / 1000).toFixed(1) + " km";
  }

  function haversineDistance(start, end) {
    const earthRadius = 6371000;
    const lat1 = toRadians(start.lat);
    const lat2 = toRadians(end.lat);
    const deltaLat = toRadians(end.lat - start.lat);
    const deltaLng = toRadians(end.lng - start.lng);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  initialize();
})();





