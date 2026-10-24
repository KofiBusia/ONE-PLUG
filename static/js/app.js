/* Server bootstrap: Flask injects a JSON data island (#oneplug-boot) in templates/index.html.
   A non-executable <script type="application/json"> keeps this readable under a strict CSP
   that disallows inline JavaScript. Maps keys come from environment variables
   (GOOGLE_MAPS_API_KEY, GOOGLE_MAP_ID). */
const BOOT = JSON.parse(document.getElementById("oneplug-boot")?.textContent || "null")
  || {config:{},operators:{},stations:[],countries:{}};
const API = BOOT.config.apiBase || "/api";
const GOOGLE_MAPS_API_KEY = BOOT.config.googleMapsApiKey || "";
const GOOGLE_MAP_ID       = BOOT.config.googleMapId || "";

/* ---------- i18n: English / French UI strings. Values the backend validates verbatim
   (problem-report "issue" text) are NEVER translated -- only their displayed labels are. ---------- */
const STR={
  stopChargingFirst:{en:"Stop charging first",fr:"Arrêtez d'abord la charge"},
  navigate:{en:"Navigate",fr:"Itinéraire"},cancel:{en:"Cancel",fr:"Annuler"},
  cancelHoldAria:{en:"Cancel hold",fr:"Annuler la réservation"},done:{en:"Done",fr:"Terminé"},
  backAria:{en:"Back",fr:"Retour"},
  offline:{en:"Offline",fr:"Hors ligne"},offlineLower:{en:"offline",fr:"hors ligne"},
  available:{en:"Available",fr:"Disponible"},inUse:{en:"In use",fr:"En cours d'utilisation"},
  inUseLower:{en:"in use",fr:"en cours d'utilisation"},
  countryChangeAria:{en:n=>`Country: ${n}. Change country`,fr:n=>`Pays : ${n}. Changer de pays`},
  searchPlaceholder:{en:c=>`Search ${c} chargers & swaps`,fr:c=>`Rechercher des chargeurs et stations d'échange à ${c}`},
  showAllOf:{en:n=>`Show all of ${n}`,fr:n=>`Tout afficher : ${n}`},
  pricesIn:{en:(c,n,cur)=>`${c}, ${n} · prices in ${cur}`,fr:(c,n,cur)=>`${c}, ${n} · prix en ${cur}`},
  chooseCountry:{en:"Choose country",fr:"Choisir un pays"},
  countryIntro:{en:"One OnePlug account works in every country. The map, networks, currency and payment methods switch to the country you pick. Your vehicles and saved stations come with you.",
    fr:"Un seul compte OnePlug fonctionne dans tous les pays. La carte, les réseaux, la devise et les moyens de paiement changent selon le pays choisi. Vos véhicules et stations enregistrées vous suivent."},
  useMyLocation:{en:"Use my location",fr:"Utiliser ma position"},
  stationsCountLbl:{en:n=>`${n} stations`,fr:n=>`${n} stations`},
  countryNote:{en:"Each country is one settings entry: currency, payment methods, map area, language and its partner networks. Adding a market doesn't change the app.",
    fr:"Chaque pays est une seule entrée de paramètres : devise, moyens de paiement, zone de carte, langue et réseaux partenaires. Ajouter un marché ne change pas l'application."},
  locUnavailablePick:{en:"Location isn't available. Pick from the list.",fr:"La position n'est pas disponible. Choisissez dans la liste."},
  notLiveNear:{en:n=>`OnePlug isn't live near you yet. Showing ${n}, the closest country.`,fr:n=>`OnePlug n'est pas encore actif près de chez vous. Affichage de ${n}, le pays le plus proche.`},
  locOffPick:{en:"Location is off. Pick a country from the list.",fr:"La localisation est désactivée. Choisissez un pays dans la liste."},
  nothingFreeHold:{en:"Nothing free to hold here right now",fr:"Rien de disponible à réserver ici pour le moment"},
  battHeldSlot:{en:s=>`Battery in slot ${s} held for 15 minutes`,fr:s=>`Batterie du logement ${s} réservée pour 15 minutes`},
  chargerHeldType:{en:t=>`${t} charger held for 15 minutes`,fr:t=>`Chargeur ${t} réservé pour 15 minutes`},
  holdCancelled:{en:"Hold cancelled",fr:"Réservation annulée"},
  holdExpired:{en:"Your hold expired",fr:"Votre réservation a expiré"},
  heldForYouLeft:{en:m=>`Held for you · ${m} left`,fr:m=>`Réservé pour vous · ${m} restant`},
  fullBatterySlot:{en:s=>`Full battery in slot ${s}`,fr:s=>`Batterie pleine au logement ${s}`},
  swapHere:{en:"Swap here",fr:"Échanger ici"},chargeHere:{en:"Charge here",fr:"Charger ici"},
  batterySwapWord:{en:"Battery swap",fr:"Échange de batterie"},chargingWord:{en:"Charging",fr:"Charge"},
  nothingFreeNearbyTitle:{en:"Nothing free nearby",fr:"Rien de disponible à proximité"},
  stationsBusyOrDontFit:{en:(n,v)=>`Stations in ${n} are busy or don't fit ${v} right now. Try another filter or vehicle.`,
    fr:(n,v)=>`Les stations ${n} sont occupées ou ne conviennent pas à ${v} pour le moment. Essayez un autre filtre ou véhicule.`},
  nearestSwapFor:{en:v=>`Nearest swap for ${v}`,fr:v=>`Échange le plus proche pour ${v}`},
  bestChargerFor:{en:v=>`Best charger for ${v}`,fr:v=>`Meilleur chargeur pour ${v}`},
  fullPacksPrice:{en:(n,p)=>`${n} full pack${n===1?"":"s"} · ${p}/swap`,fr:(n,p)=>`${n} batterie${n===1?"":"s"} pleine${n===1?"":"s"} · ${p}/échange`},
  freePriceKwh:{en:(n,p)=>`${n} free · ${p}/kWh`,fr:(n,p)=>`${n} disponible${n===1?"":"s"} · ${p}/kWh`},
  hold15:{en:"Hold 15 min",fr:"Réserver 15 min"},details:{en:"Details",fr:"Détails"},
  kindAll:{en:"All",fr:"Tous"},kindCharging:{en:"Charging",fr:"Charge"},kindSwap:{en:"Battery swap",fr:"Échange de batterie"},
  filterFullBatteries:{en:"Full batteries",fr:"Batteries pleines"},filterAvailable:{en:"Available",fr:"Disponible"},
  filterAvailableNow:{en:"Available now",fr:"Disponible maintenant"},filterSaved:{en:"Saved",fr:"Enregistrées"},
  legendCharger:{en:"Charger",fr:"Chargeur"},legendBatterySwap:{en:"Battery swap",fr:"Échange de batterie"},
  stateFull:{en:"Full",fr:"Pleine"},stateAvailable:{en:"Available",fr:"Disponible"},
  stateAvailOrFull:{en:"Available / full",fr:"Disponible / pleine"},stateCharging:{en:"Charging",fr:"En charge"},
  stateInUse:{en:"In use",fr:"En cours d'utilisation"},stateInUseOrCharging:{en:"In use / charging",fr:"En cours d'utilisation / en charge"},
  mapNotConnectedTitle:{en:"Map not connected",fr:"Carte non connectée"},
  mapNotConnectedBody:{en:"Google Maps loads when this file is hosted on your own site with your API key and Map ID pasted into <code>GOOGLE_MAPS_API_KEY</code> and <code>GOOGLE_MAP_ID</code>. Everything else in the app works here.",
    fr:"Google Maps se charge lorsque ce fichier est hébergé sur votre propre site avec votre clé API et votre ID de carte renseignés dans <code>GOOGLE_MAPS_API_KEY</code> et <code>GOOGLE_MAP_ID</code>. Tout le reste de l'application fonctionne ici."},
  mapsRejectedTitle:{en:"Google Maps rejected the key",fr:"Google Maps a refusé la clé"},
  mapsRejectedBody:{en:"Check that billing is on, the Maps JavaScript API is enabled, and the key's website restrictions include this domain.",
    fr:"Vérifiez que la facturation est activée, que l'API JavaScript Maps est activée, et que les restrictions de site de la clé incluent ce domaine."},
  mapCouldntLoadTitle:{en:"The map couldn't load",fr:"La carte n'a pas pu se charger"},
  mapCouldntLoadBodyA:{en:"Check your connection and the Map ID, then reload.",fr:"Vérifiez votre connexion et l'ID de carte, puis actualisez."},
  mapCouldntLoadBodyB:{en:"Google Maps didn't respond. Check your connection and reload.",fr:"Google Maps n'a pas répondu. Vérifiez votre connexion et actualisez."},
  myLocationAria:{en:"Go to my location",fr:"Aller à ma position"},zoomInAria:{en:"Zoom in",fr:"Zoomer"},
  zoomOutAria:{en:"Zoom out",fr:"Dézoomer"},mapAria:{en:"Map of charging stations",fr:"Carte des stations de charge"},
  searchStationsAria:{en:"Search stations",fr:"Rechercher des stations"},
  splashAria:{en:"OnePlug, charge and swap",fr:"OnePlug, charge et échange"},
  appTagline:{en:"One app. Every charge, every swap.",fr:"Une appli. Chaque charge, chaque échange."},
  tabMap:{en:"Map",fr:"Carte"},tabCharging:{en:"Charging",fr:"Charge"},tabWallet:{en:"Wallet",fr:"Portefeuille"},tabAccount:{en:"Account",fr:"Compte"},
  splashTagShort:{en:"Charge · Swap",fr:"Charge · Échange"},
  exploreSectionAria:{en:"Find chargers",fr:"Trouver des chargeurs"},
  stationTypeAria:{en:"Station type",fr:"Type de station"},filtersAria:{en:"Filters",fr:"Filtres"},
  mainNavAria:{en:"Main",fr:"Principal"},nearbyHeading:{en:"Nearby",fr:"À proximité"},
  legendMapKeyAria:{en:"Map key",fr:"Légende de la carte"},
  locUnavailableShowing:{en:c=>`Location isn't available. Showing ${c}.`,fr:c=>`La position n'est pas disponible. Affichage de ${c}.`},
  locOffShowing:{en:c=>`Location is off. Showing ${c}.`,fr:c=>`La localisation est désactivée. Affichage de ${c}.`},
  ringLabelCharge:{en:(n,a,b,o)=>`${n} chargers installed: ${a} available, ${b} in use, ${o} offline`,
    fr:(n,a,b,o)=>`${n} chargeurs installés : ${a} disponibles, ${b} en cours d'utilisation, ${o} hors ligne`},
  ringLabelSwap:{en:(n,a,b,o)=>`Battery swap, ${n} slots: ${a} full, ${b} charging, ${o} offline`,
    fr:(n,a,b,o)=>`Échange de batterie, ${n} logements : ${a} pleines, ${b} en charge, ${o} hors ligne`},
  clusterTitle:{en:(c,a,b,o)=>`${c} stations: ${a} available or full, ${b} in use or charging, ${o} offline`,
    fr:(c,a,b,o)=>`${c} stations : ${a} disponibles ou pleines, ${b} en cours d'utilisation ou en charge, ${o} hors ligne`},
  netLabelCharge:{en:n=>`${n} charging stations`,fr:n=>`${n} stations de charge`},
  netLabelSwap:{en:n=>`${n} swap stations`,fr:n=>`${n} stations d'échange`},
  netLabelBoth:{en:(c,s)=>`${c} charging · ${s} swap`,fr:(c,s)=>`${c} charge · ${s} échange`},
  countFullCharging:{en:(a,b,o)=>`${a} full · ${b} charging${o?` · ${o} offline`:""}`,fr:(a,b,o)=>`${a} pleines · ${b} en charge${o?` · ${o} hors ligne`:""}`},
  countAvailInUse:{en:(a,b,o)=>`${a} available · ${b} in use${o?` · ${o} offline`:""}`,fr:(a,b,o)=>`${a} disponibles · ${b} en cours d'utilisation${o?` · ${o} hors ligne`:""}`},
  perSwap:{en:"/swap",fr:"/échange"},perKwh:{en:"/kWh",fr:"/kWh"},
  upToKw:{en:n=>`up to ${n} kW`,fr:n=>`jusqu'à ${n} kW`},
  noStationsMatch:{en:"No stations match. Remove a filter or switch to All.",fr:"Aucune station ne correspond. Retirez un filtre ou choisissez Tous."},
  ratingsReportsTitle:{en:"Ratings & reports",fr:"Avis et signalements"},
  ratingsCountLbl:{en:n=>`${n} ratings`,fr:n=>`${n} avis`},
  problemsReported:{en:n=>`${n} problem${n>1?"s":""} reported`,fr:n=>`${n} problème${n>1?"s":""} signalé${n>1?"s":""}`},
  noProblemsShort:{en:"No problems reported",fr:"Aucun problème signalé"},
  noProblems3d:{en:"No problems reported in the last 3 days",fr:"Aucun problème signalé au cours des 3 derniers jours"},
  reportedAgoPrefix:{en:"Reported",fr:"Signalé"},yourRatingPrefix:{en:"Your rating",fr:"Votre avis"},
  rateStationBtn:{en:"Rate station",fr:"Évaluer la station"},reportProblemBtn:{en:"Report problem",fr:"Signaler un problème"},
  statusLooksRight:{en:"Status looks right",fr:"Le statut est correct"},
  agoMin:{en:n=>`${n} min ago`,fr:n=>`il y a ${n} min`},agoHour:{en:n=>`${n} h ago`,fr:n=>`il y a ${n} h`},agoDay:{en:n=>`${n} d ago`,fr:n=>`il y a ${n} j`},
  updatedPrefix:{en:"Updated",fr:"Mis à jour"},confirmedByYou:{en:"confirmed by you",fr:"confirmé par vous"},
  confirmedByDriver:{en:"confirmed by a driver",fr:"confirmé par un conducteur"},liveFrom:{en:n=>`live from ${n}`,fr:n=>`en direct de ${n}`},
  reasonHolding:{en:"the one you're holding",fr:"celui que vous réservez"},
  reasonLastUsed:{en:"the one you last used",fr:"celui que vous avez utilisé en dernier"},
  reasonOfflineMany:{en:"the ones showing offline",fr:"ceux affichés hors ligne"},
  reasonOfflineOne:{en:"the one showing offline",fr:"celui affiché hors ligne"},
  reportTitle:{en:"Report a problem",fr:"Signaler un problème"},
  reportGoesTo:{en:(o,n)=>`Goes straight to ${o} · ${n}`,fr:(o,n)=>`Transmis directement à ${o} · ${n}`},
  whichBatteriesQ:{en:"Which batteries?",fr:"Quelles batteries ?"},whichChargersQ:{en:"Which chargers?",fr:"Quels chargeurs ?"},
  autoSelectBtn:{en:"Auto-select",fr:"Sélection auto"},
  affectedBatterySlotsAria:{en:"Affected battery slots",fr:"Logements concernés"},affectedChargersAria:{en:"Affected chargers",fr:"Chargeurs concernés"},
  unitSlot:{en:n=>`Slot ${n}`,fr:n=>`Logement ${n}`},unitCharger:{en:id=>`Charger ${id}`,fr:id=>`Chargeur ${id}`},
  unitFull:{en:"Full",fr:"Pleine"},unitFreeConn:{en:"Free",fr:"Libre"},unitCharging:{en:"Charging",fr:"En charge"},
  unitInUse:{en:"In use",fr:"En cours d'utilisation"},unitOffline:{en:"Offline",fr:"Hors ligne"},unitHeld:{en:"Held",fr:"Réservé"},
  whatsWrongQ:{en:"What's wrong?",fr:"Quel est le problème ?"},addPhotosQ:{en:"Add photos",fr:"Ajouter des photos"},
  optionalUpTo3:{en:"Optional · up to 3",fr:"Facultatif · jusqu'à 3"},
  reportNotePlaceholder:{en:"Anything else? (e.g. screen shows error E-42, cable cut near the plug)",
    fr:"Autre chose à signaler ? (ex. écran affichant l'erreur E-42, câble coupé près de la prise)"},
  pickWhatsWrong:{en:"Pick what's wrong to send",fr:"Choisissez le problème pour envoyer"},
  photoAlt:{en:n=>`Photo ${n} of the problem`,fr:n=>`Photo ${n} du problème`},
  removePhotoAria:{en:n=>`Remove photo ${n}`,fr:n=>`Supprimer la photo ${n}`},
  addMorePhotos:{en:"Add more",fr:"Ajouter d'autres"},addPhoto:{en:"Add photo",fr:"Ajouter une photo"},
  addPhotoOfProblemAria:{en:"Add photo of the problem",fr:"Ajouter une photo du problème"},
  unitWordBattery:{en:n=>n>1?"batteries":"battery",fr:n=>n>1?"batteries":"batterie"},
  unitWordCharger:{en:n=>n>1?"chargers":"charger",fr:n=>n>1?"chargeurs":"chargeur"},
  photoWord:{en:n=>`${n} photo${n>1?"s":""}`,fr:n=>`${n} photo${n>1?"s":""}`},
  sendReport:{en:"Send report",fr:"Envoyer le signalement"},
  rateStationTitle:{en:n=>`Rate ${n}`,fr:n=>`Évaluer ${n}`},
  starAria:{en:n=>`${n} star${n>1?"s":""}`,fr:n=>`${n} étoile${n>1?"s":""}`},
  starsOutOf5Aria:{en:n=>`${n} out of 5 stars`,fr:n=>`${n} sur 5 étoiles`},
  rateNotePlaceholder:{en:"Optional: what was it like? (e.g. fast, clean, friendly staff)",
    fr:"Facultatif : comment était-ce ? (ex. rapide, propre, personnel accueillant)"},
  submitRating:{en:"Submit rating",fr:"Envoyer l'avis"},
  thanksForRating:{en:n=>`Thanks for rating ${n}`,fr:n=>`Merci d'avoir évalué ${n}`},
  couldntSendRating:{en:"Couldn't send your rating. Try again.",fr:"Impossible d'envoyer votre avis. Réessayez."},
  nothingStandsOutBatteries:{en:"Nothing stands out. Tap the affected batteries.",fr:"Rien ne se démarque. Touchez les batteries concernées."},
  nothingStandsOutChargers:{en:"Nothing stands out. Tap the affected chargers.",fr:"Rien ne se démarque. Touchez les chargeurs concernés."},
  selectedToast:{en:(l,w)=>`Selected ${l}: ${w}. Tap to change.`,fr:(l,w)=>`${l} sélectionné(s) : ${w}. Touchez pour modifier.`},
  reportSent:{en:(o,u,n)=>`Report sent to ${o}${u?` for ${u}`:""}${n?` with ${n} photo${n>1?"s":""}`:""}. Thank you`,
    fr:(o,u,n)=>`Signalement envoyé à ${o}${u?` pour ${u}`:""}${n?` avec ${n} photo${n>1?"s":""}`:""}. Merci`},
  couldntSendReport:{en:"Couldn't send your report. Try again.",fr:"Impossible d'envoyer le signalement. Réessayez."},
  statusConfirmedToast:{en:"Thanks — status confirmed",fr:"Merci — statut confirmé"},
  couldntConfirm:{en:"Couldn't confirm. Try again.",fr:"Impossible de confirmer. Réessayez."},
  removeFromSaved:{en:"Remove from saved",fr:"Retirer des favoris"},saveStation:{en:"Save station",fr:"Enregistrer la station"},
  chargingStationBanner:{en:"Charging station",fr:"Station de charge"},batterySwapStationBanner:{en:"Battery swap station",fr:"Station d'échange de batterie"},
  networkSuffix:{en:n=>`${n} network`,fr:n=>`Réseau ${n}`},priceLbl:{en:"Price",fr:"Prix"},
  perKwhPrice:{en:p=>`${p} per kWh`,fr:p=>`${p} par kWh`},distanceLbl:{en:"Distance",fr:"Distance"},
  hoursLbl:{en:"Hours",fr:"Horaires"},nearbyLbl:{en:"Nearby",fr:"À proximité"},
  chooseChargerTitle:{en:"Choose a charger",fr:"Choisir un chargeur"},
  doesntFit:{en:n=>` · doesn't fit ${n}`,fr:n=>` · ne convient pas à ${n}`},
  heldForYouStatus:{en:"Held for you",fr:"Réservé pour vous"},
  noAccountNeededCharge:{en:o=>`No ${o} account needed. You pay from your OnePlug wallet.`,fr:o=>`Aucun compte ${o} nécessaire. Vous payez depuis votre portefeuille OnePlug.`},
  startCharging:{en:"Start charging",fr:"Démarrer la charge"},
  usesBatterySwap:{en:v=>`Your ${v} uses battery swap`,fr:v=>`Votre ${v} utilise l'échange de batterie`},
  noCompatibleCharger:{en:"No compatible charger free",fr:"Aucun chargeur compatible disponible"},
  removedFromSaved:{en:"Removed from saved",fr:"Retiré des favoris"},saved:{en:"Saved",fr:"Enregistré"},
  topUpToStart:{en:"Top up your wallet to start charging",fr:"Rechargez votre portefeuille pour démarrer la charge"},
  swapPriceLbl:{en:"Swap price",fr:"Prix de l'échange"},perSwapPrice:{en:p=>`${p} per swap`,fr:p=>`${p} par échange`},
  swapTimeLbl:{en:"Swap time",fr:"Durée de l'échange"},about2min:{en:"About 2 minutes",fr:"Environ 2 minutes"},
  vehiclesLbl:{en:"Vehicles",fr:"Véhicules"},batteryPackLbl:{en:"Battery pack",fr:"Type de batterie"},
  batterySlotsTitle:{en:"Battery slots",fr:"Logements de batterie"},swappingForTitle:{en:"Swapping for",fr:"Échange pour"},
  fullBatteriesWord:{en:"full batteries",fr:"batteries pleines"},
  notSupportedHere:{en:" · not supported here",fr:" · non pris en charge ici"},
  swapAccountNote:{en:o=>`No ${o} account needed. Swaps are paid from your OnePlug wallet.`,fr:o=>`Aucun compte ${o} nécessaire. Les échanges sont payés depuis votre portefeuille OnePlug.`},
  swapOnlyNote:{en:"Battery swap is for e-motorbikes and e-tricycles. Add one in Account to swap here.",
    fr:"L'échange de batterie est réservé aux motos et tricycles électriques. Ajoutez-en un dans Compte pour échanger ici."},
  swapBtnReady:{en:p=>`Swap battery · ${p}`,fr:p=>`Échanger la batterie · ${p}`},
  pickSwapVehicle:{en:"Pick a swap vehicle",fr:"Choisissez un véhicule à échange"},
  noPacksHere:{en:v=>`No ${v} packs here`,fr:v=>`Aucune batterie pour ${v} ici`},
  noFullBatteries:{en:"No full batteries right now",fr:"Aucune batterie pleine pour le moment"},
  topUpToSwap:{en:"Top up your wallet to swap",fr:"Rechargez votre portefeuille pour échanger"},
  stepReserved:{en:s=>`Full battery reserved in slot ${s}`,fr:s=>`Batterie pleine réservée au logement ${s}`},
  stepSwitchOff:{en:v=>`Switch off your ${v} and remove the empty battery`,fr:v=>`Éteignez votre ${v} et retirez la batterie vide`},
  stepOpens:{en:s=>`Slot ${s} opens: leave your empty battery, take the full one`,fr:s=>`Le logement ${s} s'ouvre : déposez votre batterie vide, prenez la pleine`},
  stepPaid:{en:p=>`Paid ${p} from your wallet`,fr:p=>`${p} payé depuis votre portefeuille`},
  swappingBatteryTitle:{en:"Swapping battery",fr:"Échange de batterie en cours"},swapCompleteTitle:{en:"Swap complete",fr:"Échange terminé"},
  demoAutoNote:{en:"Demo: each step completes automatically.",fr:"Démo : chaque étape se termine automatiquement."},
  receiptTitle:{en:"Receipt",fr:"Reçu"},vehicleLbl:{en:"Vehicle",fr:"Véhicule"},
  rangeNowTitle:{en:"Range now",fr:"Autonomie maintenant"},
  rangeNowLbl:{en:r=>`About ${r} km`,fr:r=>`Environ ${r} km`},networkLbl:{en:"Network",fr:"Réseau"},
  paidFromWalletLbl:{en:"Paid from wallet",fr:"Payé depuis le portefeuille"},
  chargingAt:{en:n=>`Charging at ${n}`,fr:n=>`Charge en cours à ${n}`},
  reachedLimit:{en:"Reached charge limit",fr:"Limite de charge atteinte"},
  walletUsedUp:{en:"Wallet balance used up",fr:"Solde du portefeuille épuisé"},stoppedByYou:{en:"Stopped by you",fr:"Arrêtée par vous"},
  batteryAria:{en:(s,l)=>`Battery ${s} percent, limit ${l} percent`,fr:(s,l)=>`Batterie à ${s} pour cent, limite ${l} pour cent`},
  chargingEtaMin:{en:(e,l)=>`Charging · ${e} min to ${l}%`,fr:(e,l)=>`Charge en cours · ${e} min jusqu'à ${l} %`},
  powerLbl:{en:"Power",fr:"Puissance"},energyAddedLbl:{en:"Energy added",fr:"Énergie ajoutée"},
  costSoFarLbl:{en:"Cost so far",fr:"Coût jusqu'ici"},rangeAddedLbl:{en:"Range added",fr:"Autonomie ajoutée"},
  chargerLbl:{en:"Charger",fr:"Chargeur"},stopChargingBtn:{en:"Stop charging",fr:"Arrêter la charge"},
  demoSpeedNote:{en:"Demo speed: 1 second ≈ 3 minutes.",fr:"Vitesse de démo : 1 seconde ≈ 3 minutes."},
  socRangeIn:{en:(f,s,m)=>`${f}% → ${s}% in ${m} min`,fr:(f,s,m)=>`${f}% → ${s}% en ${m} min`},
  receiptIdTitle:{en:id=>`Receipt ${id}`,fr:id=>`Reçu ${id}`},locationLbl:{en:"Location",fr:"Lieu"},energyLbl:{en:"Energy",fr:"Énergie"},
  recentTitle:{en:"Recent",fr:"Récent"},batterySwapRangeFrom:{en:f=>`Battery swap ${f}% → 100%`,fr:f=>`Échange de batterie ${f}% → 100%`},
  rangeLeft:{en:k=>`About ${k} km left`,fr:k=>`Environ ${k} km restants`},swapSoonSuffix:{en:" · swap soon",fr:" · échangez bientôt"},
  findSwapStation:{en:"Find swap station",fr:"Trouver une station d'échange"},scanStation:{en:"Scan station",fr:"Scanner la station"},
  rideInNote:{en:"Ride in, swap your empty battery for a full one in about 2 minutes, and pay from your OnePlug wallet.",
    fr:"Entrez, échangez votre batterie vide contre une pleine en environ 2 minutes, et payez depuis votre portefeuille OnePlug."},
  parkedSuffix:{en:"parked",fr:"garé"},aboutKmRange:{en:k=>`About ${k} km range`,fr:k=>`Environ ${k} km d'autonomie`},
  chargeLimitLbl:{en:"Charge limit",fr:"Limite de charge"},scanCharger:{en:"Scan charger",fr:"Scanner le chargeur"},
  findCharger:{en:"Find charger",fr:"Trouver un chargeur"},
  plugInNote:{en:c=>`Plug into any network's charger in ${c}. Scan its QR code or pick it from the map, and OnePlug handles the rest.`,
    fr:c=>`Branchez-vous sur le chargeur de n'importe quel réseau, ${c}. Scannez son code QR ou choisissez-le sur la carte, et OnePlug s'occupe du reste.`},
  scanChargerTitle:{en:"Scan charger",fr:"Scanner le chargeur"},
  scanIntro:{en:"Point your camera at the QR code on any charger or swap station, from any network.",
    fr:"Pointez votre caméra vers le code QR de n'importe quel chargeur ou station d'échange, de n'importe quel réseau."},
  enterIdLabel:{en:"Or enter the charger or station ID",fr:"Ou saisissez l'identifiant du chargeur ou de la station"},
  simulateScan:{en:"Simulate scan",fr:"Simuler un scan"},continueBtn:{en:"Continue",fr:"Continuer"},
  chargerNotFound:{en:"Charger ID not found. It's printed under the QR code, like GH-VG-001-1 or GH-PS-001.",
    fr:"Identifiant introuvable. Il est imprimé sous le code QR, par ex. GH-VG-001-1 ou GH-PS-001."},
  chargerStatusMsg:{en:(id,st,n)=>`${id} is ${st}. Pick another charger at ${n}.`,fr:(id,st,n)=>`${id} est ${st}. Choisissez un autre chargeur à ${n}.`},
  noSwapNearby:{en:"No swap station with full batteries nearby",fr:"Aucune station d'échange avec batteries pleines à proximité"},
  networkCountCharge:{en:n=>`${n} charging network${n===1?"":"s"}`,fr:n=>`${n} réseau${n===1?"":"x"} de charge`},
  networkCountSwap:{en:n=>`${n} battery-swap network${n===1?"":"s"}`,fr:n=>`${n} réseau${n===1?"":"x"} d'échange de batterie`},
  walletTitle:{en:"Wallet",fr:"Portefeuille"},
  walletCurrency:{en:(c,cur)=>`${c} wallet · ${cur}`,fr:(c,cur)=>`Portefeuille ${c} · ${cur}`},
  acceptedAt:{en:(a,b,n,c)=>`Accepted at ${a} and ${b}, ${n} stations in ${c}.`,fr:(a,b,n,c)=>`Accepté par ${a} et ${b} — ${n} stations, ${c}.`},
  addFundsBtn:{en:"Add funds",fr:"Ajouter des fonds"},historyTitle:{en:"History",fr:"Historique"},
  payWithTitle:{en:"Pay with",fr:"Payer avec"},bankCard:{en:"Bank card",fr:"Carte bancaire"},
  cardNumberLbl:{en:"Card number",fr:"Numéro de carte"},mobileMoneyLbl:{en:"Mobile Money number",fr:"Numéro Mobile Money"},
  cardChargedNote:{en:"Your card is charged now.",fr:"Votre carte est débitée maintenant."},
  momoPromptNote:{en:"You'll get a prompt on your phone to approve with your PIN.",fr:"Vous recevrez une notification sur votre téléphone pour approuver avec votre code PIN."},
  demoOnlyNote:{en:"Demo only, no money moves.",fr:"Démo uniquement, aucun argent ne circule."},
  addAmountBtn:{en:a=>`Add ${a}`,fr:a=>`Ajouter ${a}`},
  enterCardNumber:{en:"Enter your card number",fr:"Saisissez votre numéro de carte"},
  enterMomoNumber:{en:"Enter your mobile money number",fr:"Saisissez votre numéro Mobile Money"},
  processingBtn:{en:"Processing…",fr:"Traitement…"},approveOnPhoneBtn:{en:"Approve on your phone…",fr:"Approbation sur votre téléphone…"},
  addedToast:{en:a=>`Added ${a}`,fr:a=>`${a} ajouté`},
  fundsAddedWord:{en:"Funds added",fr:"Fonds ajoutés"},welcomeCreditWord:{en:"Welcome credit",fr:"Crédit de bienvenue"},
  earlierVersionsTitle:{en:"Earlier versions",fr:"Versions antérieures"},
  accountTitle:{en:"Account",fr:"Compte"},
  rfidSub:{en:"OnePlug charge card · tap at any network's charger",fr:"Carte de charge OnePlug · à présenter sur le chargeur de n'importe quel réseau"},
  countryTitle:{en:"Country",fr:"Pays"},changeLbl:{en:"Change",fr:"Modifier"},vehiclesTitle:{en:"Vehicles",fr:"Véhicules"},
  swapVehicleSub:{en:(v,r)=>`${v} · battery swap · ~${r} km`,fr:(v,r)=>`${v} · échange de batterie · ~${r} km`},
  chargeVehicleSub:{en:(b,p)=>`${b} kWh · ${p}`,fr:(b,p)=>`${b} kWh · ${p}`},
  addVehicleBtn:{en:"Add vehicle",fr:"Ajouter un véhicule"},chargingStatsTitle:{en:"Charging stats",fr:"Statistiques de charge"},
  chargingSessionsLbl:{en:"Charging sessions",fr:"Sessions de charge"},batterySwapsLbl:{en:"Battery swaps",fr:"Échanges de batterie"},
  energyChargedLbl:{en:"Energy charged",fr:"Énergie chargée"},spentLbl:{en:"Spent",fr:"Dépensé"},
  chargingNetworksTitle:{en:"Charging networks",fr:"Réseaux de charge"},swapNetworksTitle:{en:"Battery-swap networks",fr:"Réseaux d'échange de batterie"},
  ocpiConnected:{en:"OCPI · Connected",fr:"OCPI · Connecté"},partnerConnected:{en:"Partner API · Connected",fr:"API partenaire · Connecté"},
  networksNote:{en:"Charging networks link through OCPI roaming. Battery-swap networks link through a partner API that shares slot availability and takes swap payments. Both feed one station list, so you find and pay for any of them here.",
    fr:"Les réseaux de charge se connectent via l'itinérance OCPI. Les réseaux d'échange de batterie se connectent via une API partenaire qui partage la disponibilité des logements et traite les paiements d'échange. Les deux alimentent une seule liste de stations, pour tout trouver et payer ici."},
  appearanceLbl:{en:"Appearance",fr:"Apparence"},autoLbl:{en:"Auto",fr:"Auto"},lightLbl:{en:"Light",fr:"Clair"},darkLbl:{en:"Dark",fr:"Sombre"},
  demoDataLbl:{en:"Demo data",fr:"Données de démo"},resetBtn:{en:"Reset",fr:"Réinitialiser"},
  languageLbl:{en:"Language",fr:"Langue"},englishLbl:{en:"English",fr:"Anglais"},frenchLbl:{en:"Français",fr:"Français"},
  switchLanguageAria:{en:n=>`Switch language to ${n}`,fr:n=>`Changer la langue en ${n}`},
  oneAccountNote:{en:"OnePlug Africa: one account in every country. Switching country changes the map, networks, currency and payment methods; your vehicles, saved stations and history come with you. Each country keeps its own wallet balance in local currency.",
    fr:"OnePlug Africa : un seul compte dans tous les pays. Changer de pays modifie la carte, les réseaux, la devise et les moyens de paiement ; vos véhicules, stations enregistrées et historique vous suivent. Chaque pays conserve son propre solde de portefeuille en devise locale."},
  prototypeNote:{en:"Prototype with fictional networks and demo prices at real locations in 6 countries. Charger status, battery slots, charging and swaps are simulated.",
    fr:"Prototype avec des réseaux fictifs et des prix de démonstration sur des emplacements réels dans 6 pays. L'état des chargeurs, les logements de batterie, la charge et les échanges sont simulés."},
  demoReset:{en:"Demo data reset",fr:"Données de démo réinitialisées"},
  typeTitle:{en:"Type",fr:"Type"},carWord:{en:"Car",fr:"Voiture"},nameLbl:{en:"Name",fr:"Nom"},
  namePlaceholderCar:{en:"e.g. Hyundai Kona",fr:"ex. Hyundai Kona"},namePlaceholderMoto:{en:"e.g. My okada",fr:"ex. Mon okada"},
  namePlaceholderTrike:{en:"e.g. My pragya",fr:"ex. Mon pragya"},batterySizeLbl:{en:"Battery size (kWh)",fr:"Capacité de la batterie (kWh)"},
  plugsAcceptedTitle:{en:"Plugs your car accepts",fr:"Prises acceptées par votre voiture"},
  rangeLbl:{en:"Range on a full battery (km)",fr:"Autonomie batterie pleine (km)"},
  swapVehicleNote:{en:v=>`${v}s use battery swap stations: trade your empty battery for a full one instead of plugging in.`,
    fr:v=>`Ce type de véhicule (${v}) utilise les stations d'échange de batterie : échangez votre batterie vide contre une pleine au lieu de brancher.`},
  nameVehiclePrompt:{en:"Name your vehicle",fr:"Nommez votre véhicule"},pickPlugPrompt:{en:"Pick at least one plug",fr:"Choisissez au moins une prise"},
  vehicleAdded:{en:"Vehicle added",fr:"Véhicule ajouté"},
  vclMotorbike:{en:"E-motorbike",fr:"Moto électrique"},vclTricycle:{en:"E-tricycle",fr:"Tricycle électrique"},
};
let LANG="en";
try{const sl=localStorage.getItem("oneplug-africa-v1-lang");if(sl==="fr"||sl==="en")LANG=sl;}catch(e){}
function t(k,...a){const e=STR[k];if(!e)return k;const v=e[LANG]||e.en;return typeof v==="function"?v(...a):v;}

/* ---------- Network data now lives in the database (see seed/seed_data.json) ---------- */
const OPS = BOOT.operators;
const STATIONS = BOOT.stations;
const ME={lat:5.6037,lng:-0.1870};
const VCLASSES=["Motorbike","Tricycle"];
const IC={bolt:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 1.5 3.5 14h7.5l-1.5 8.5L20.5 10H13l.5-8.5z"/></svg>`,
  batt:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="6" width="18.5" height="12" rx="3" fill="currentColor"/><rect x="20.5" y="9.5" width="2.5" height="5" rx="1" fill="currentColor"/><path d="M5.5 10.2h8.5l-1.6-1.6M14 13.8H5.5l1.6 1.6" fill="none" stroke="var(--icon-cut,#fff)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  all:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>`};
const PLUGS=["CCS2","Type 2","CHAdeMO","GB/T"];

/* ---------- COUNTRIES: adding a country = one entry here + its networks and stations ---------- */
const COUNTRIES = BOOT.countries;
let CC="gh";try{const m=localStorage.getItem("oneplug-africa-v1-country");if(m&&COUNTRIES[m])CC=m;}catch(e){}
const C=(k=CC)=>COUNTRIES[k];
Object.assign(ME,C().me);
try{if(!localStorage.getItem("oneplug-africa-v1-lang")&&C().lang==="Français")LANG="fr";}catch(e){}
const _fmt={};
function money(n,cc=CC){const c=C(cc),z=["XOF","RWF","NGN","KES"].includes(c.cur)?0:2;
  const f=_fmt[cc]||(_fmt[cc]=new Intl.NumberFormat(c.locale,{style:"currency",currency:c.cur,minimumFractionDigits:z,maximumFractionDigits:z}));return f.format(n);}
const stripe=(c=C())=>`<span class="mstripe" aria-hidden="true">${c.c.map(x=>`<i style="background:${x}"></i>`).join("")}</span>`;
function renderMarket(){const c=C();
  $("#mktPill").innerHTML=stripe()+`<span>${esc(c.city)}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  $("#mktPill").setAttribute("aria-label",t("countryChangeAria",c.name));
  $("#splashMkt").innerHTML=stripe()+`<span>${esc(c.city)} · ${esc(c.name)}</span>`;
  $("#fitBtn").textContent=c.code;$("#fitBtn").setAttribute("aria-label",t("showAllOf",c.name));
  $("#q").placeholder=t("searchPlaceholder",c.city);}
function setCountry(cc){if(SES)return toast(t("stopChargingFirst"));releaseHold();CC=cc;try{localStorage.setItem("oneplug-africa-v1-country",cc);}catch(e){}
  Object.assign(ME,C().me);if(meMarker)meMarker.position={lat:ME.lat,lng:ME.lng};F.op=null;F.q="";$("#q").value="";
  renderMarket();fitGhana();const tab=(document.querySelector(".view.active")||{id:"v-explore"}).id.slice(2);renderAll();go(tab);
  toast(t("pricesIn",C().city,C().name,C().cur));}
function openCountry(){
  openPage(`<div class="topbar">${backBtn()}<span></span></div><h1 class="hero-name">${t("chooseCountry")}</h1>
    <p class="muted">${t("countryIntro")}</p>
    <button class="btn soft block" id="detect" style="margin:16px 0 6px">${t("useMyLocation")}</button>
    <div class="group">${Object.entries(COUNTRIES).map(([k,c])=>`<button class="conn" data-cc="${k}" aria-pressed="${k===CC}"><span class="radio"></span>${stripe(c)}<span class="grow"><b>${esc(c.name)}</b><div class="st-sub">${esc(c.city)} · ${c.cur} · ${esc(c.pay.join(", "))}</div></span><span class="st-sub">${t("stationsCountLbl",STATIONS.filter(s=>s.cc===k).length)}</span></button>`).join("")}</div>
    <p class="note">${t("countryNote")}</p>`);
  $("#pageBody").querySelectorAll("[data-cc]").forEach(b=>b.onclick=()=>{closePage();setCountry(b.dataset.cc);});
  $("#detect").onclick=()=>{if(!navigator.geolocation)return toast(t("locUnavailablePick"));
    navigator.geolocation.getCurrentPosition(p=>{const here={lat:p.coords.latitude,lng:p.coords.longitude};let best="gh",bd=1e9;
      for(const [k,c] of Object.entries(COUNTRIES)){const d=km(here,c.me);if(d<bd){bd=d;best=k;}}
      closePage();setCountry(best);if(bd>900)setTimeout(()=>toast(t("notLiveNear",C(best).name)),2400);},
      ()=>toast(t("locOffPick")),{timeout:8000});};
}
/* ---------- hold a charger or battery pack for 15 minutes ---------- */
let HOLD=null;
function releaseHold(){if(!HOLD)return;const s=STATIONS.find(x=>x.id===HOLD.sid),c=s&&s.conns.find(x=>x.id===HOLD.cid);if(c&&c.status==="reserved")c.status="available";HOLD=null;}
function bestFor(v){const mine=STATIONS.filter(s=>s.cc===CC).map(s=>({s,d:km(ME,s)}));
  const ok=isSwapV(v)?mine.filter(({s})=>s.kind==="swap"&&s.veh.includes(v.vclass)&&avail(s))
    :mine.filter(({s})=>s.kind==="charge"&&s.conns.some(c=>c.status==="available"&&v.plugs.includes(c.type)));
  return ok.sort((a,b)=>a.d-b.d)[0];}
function holdAt(id){const s=STATIONS.find(x=>x.id===id),v=veh();
  const c=s.kind==="swap"?s.conns.find(c=>c.status==="available"):s.conns.filter(c=>c.status==="available"&&v.plugs.includes(c.type)).sort((a,b)=>b.kw-a.kw)[0];
  if(!c)return toast(t("nothingFreeHold"));releaseHold();c.status="reserved";HOLD={sid:s.id,cid:c.id,until:Date.now()+15*6e4};
  toast(s.kind==="swap"?t("battHeldSlot",c.slot):t("chargerHeldType",c.type));renderExplore();}
const mmss=ms=>{const sec=Math.max(0,Math.round(ms/1000));return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");};
function renderHero(){const el=$("#hero");if(!el)return;const v=veh();
  if(HOLD){const s=STATIONS.find(x=>x.id===HOLD.sid),c=s.conns.find(x=>x.id===HOLD.cid),d=km(ME,s);
    el.innerHTML=`<div class="hero"><div class="k">${t("heldForYouLeft",`<span id="holdLeft" class="num">${mmss(HOLD.until-Date.now())}</span>`)}</div>
      <h3>${esc(s.name)}</h3><div class="sub">${s.kind==="swap"?t("fullBatterySlot",c.slot):`${c.type} · ${c.kw} kW`} · ${d.toFixed(1)} km · ${mins(d)} min · ${money(s.price)}${s.kind==="swap"?t("perSwap"):t("perKwh")}</div>
      <div class="acts"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">${t("navigate")}</a><button class="btn ghost" data-hopen="${s.id}">${s.kind==="swap"?t("swapHere"):t("chargeHere")}</button><button class="btn ghost" data-hcancel aria-label="${t("cancelHoldAria")}">${t("cancel")}</button></div></div>`;return;}
  const b=bestFor(v);
  if(!b){el.innerHTML=`<div class="hero"><div class="k">${isSwapV(v)?t("batterySwapWord"):t("chargingWord")} · ${esc(v.name)}</div><h3>${t("nothingFreeNearbyTitle")}</h3><div class="sub">${t("stationsBusyOrDontFit",esc(C().name),esc(v.name))}</div></div>`;return;}
  const s=b.s,k=counts(s);
  el.innerHTML=`<div class="hero"><div class="k">${isSwapV(v)?t("nearestSwapFor",esc(v.name)):t("bestChargerFor",esc(v.name))}</div>
    <h3>${esc(s.name)}</h3><div class="sub">${esc(OPS[s.op].name)} · ${b.d<1?"<1":b.d.toFixed(1)} km · ${mins(b.d)} min · ${s.kind==="swap"?t("fullPacksPrice",k.a,money(s.price)):t("freePriceKwh",k.a,money(s.price))}</div>
    <div class="acts"><button class="btn" data-hhold="${s.id}">${t("hold15")}</button><button class="btn ghost" data-hopen="${s.id}">${t("details")}</button></div></div>`;}
document.getElementById("hero").addEventListener("click",e=>{const btn=e.target.closest("button");if(!btn)return;
  if(btn.dataset.hhold)holdAt(btn.dataset.hhold);else if(btn.dataset.hopen)reopen(btn.dataset.hopen);else if("hcancel" in btn.dataset){releaseHold();toast(t("holdCancelled"));renderExplore();}});
setInterval(()=>{if(!HOLD)return;if(Date.now()>HOLD.until){releaseHold();toast(t("holdExpired"));renderExplore();return;}const e=$("#holdLeft");if(e)e.textContent=mmss(HOLD.until-Date.now());},1000);
document.getElementById("mktPill").onclick=()=>openCountry();

const LOGO=`<span class="mark"><svg viewBox="0 0 200 230" aria-hidden="true"><rect x="70" y="4" width="16" height="36" rx="6" fill="#006B3F"></rect><rect x="114" y="4" width="16" height="36" rx="6" fill="#006B3F"></rect><path d="M100 186 C100 206 118 212 140 212 L152 212" fill="none" class="lks" stroke="#10211A" stroke-width="14" stroke-linecap="round"></path><rect x="150" y="199" width="38" height="26" rx="6" class="lk" fill="#10211A"></rect><rect x="186" y="206" width="8" height="12" rx="2.5" class="lk" fill="#10211A"></rect><rect x="156" y="205" width="7" height="14" rx="1.5" fill="#FCD116"></rect><rect x="165.5" y="205" width="7" height="14" rx="1.5" fill="#FCD116"></rect><rect x="175" y="205" width="7" height="14" rx="1.5" fill="#FCD116"></rect><circle cx="100" cy="112" r="78" fill="#006B3F"></circle><circle cx="100" cy="112" r="67.5" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-dasharray="318 106" transform="rotate(-90 100 112)" opacity="0.95"></circle><circle cx="100" cy="44.5" r="4.5" fill="#FFFFFF"></circle><circle cx="100" cy="112" r="57" fill="#FCD116"></circle><polygon points="108,70 76,118 98,118 90,154 126,104 104,104 116,70" fill="#10211A" stroke="#10211A" stroke-width="2" stroke-linejoin="round"></polygon></svg></span>`,LOGO_W=`<svg viewBox="0 0 200 230" aria-hidden="true"><rect x="70" y="4" width="16" height="36" rx="6" fill="#FFFFFF"></rect><rect x="114" y="4" width="16" height="36" rx="6" fill="#FFFFFF"></rect><path d="M100 186 C100 206 118 212 140 212 L152 212" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"></path><rect x="150" y="199" width="38" height="26" rx="6" fill="#FFFFFF"></rect><rect x="186" y="206" width="8" height="12" rx="2.5" fill="#FFFFFF"></rect><rect x="156" y="205" width="7" height="14" rx="1.5" fill="#006B3F"></rect><rect x="165.5" y="205" width="7" height="14" rx="1.5" fill="#006B3F"></rect><rect x="175" y="205" width="7" height="14" rx="1.5" fill="#006B3F"></rect><circle cx="100" cy="112" r="78" fill="#FFFFFF"></circle><circle cx="100" cy="112" r="67.5" fill="none" stroke="#006B3F" stroke-width="5" stroke-linecap="round" stroke-dasharray="318 106" transform="rotate(-90 100 112)" opacity="0.95"></circle><circle cx="100" cy="44.5" r="4.5" fill="#006B3F"></circle><circle cx="100" cy="112" r="57" fill="#FCD116"></circle><polygon points="108,70 76,118 98,118 90,154 126,104 104,104 116,70" fill="#10211A" stroke="#10211A" stroke-width="2" stroke-linejoin="round"></polygon></svg>`,KENTE=`<svg class="kente" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="14" height="14" fill="#FCD116"/><rect x="14" y="0" width="6" height="14" fill="#006B3F"/><rect x="20" y="0" width="4" height="14" fill="#FCD116"/><rect x="24" y="0" width="10" height="14" fill="#CE1126"/><rect x="34" y="0" width="4" height="14" fill="#000"/><rect x="38" y="0" width="14" height="14" fill="#FCD116"/><rect x="52" y="0" width="6" height="14" fill="#CE1126"/><rect x="58" y="0" width="4" height="14" fill="#FCD116"/><rect x="62" y="0" width="10" height="14" fill="#006B3F"/><rect x="72" y="0" width="4" height="14" fill="#000"/><rect x="76" y="0" width="14" height="14" fill="#FCD116"/><rect x="90" y="0" width="6" height="14" fill="#006B3F"/><rect x="96" y="0" width="4" height="14" fill="#FCD116"/><rect x="100" y="0" width="10" height="14" fill="#CE1126"/><rect x="110" y="0" width="4" height="14" fill="#000"/><rect x="114" y="0" width="14" height="14" fill="#FCD116"/><rect x="128" y="0" width="6" height="14" fill="#CE1126"/><rect x="134" y="0" width="4" height="14" fill="#FCD116"/><rect x="138" y="0" width="10" height="14" fill="#006B3F"/><rect x="148" y="0" width="4" height="14" fill="#000"/><rect x="152" y="0" width="14" height="14" fill="#FCD116"/><rect x="166" y="0" width="6" height="14" fill="#006B3F"/><rect x="172" y="0" width="4" height="14" fill="#FCD116"/><rect x="176" y="0" width="10" height="14" fill="#CE1126"/><rect x="186" y="0" width="4" height="14" fill="#000"/><rect x="190" y="0" width="14" height="14" fill="#FCD116"/><rect x="204" y="0" width="6" height="14" fill="#CE1126"/><rect x="210" y="0" width="4" height="14" fill="#FCD116"/><rect x="214" y="0" width="10" height="14" fill="#006B3F"/><rect x="224" y="0" width="4" height="14" fill="#000"/><rect x="228" y="0" width="14" height="14" fill="#FCD116"/><rect x="242" y="0" width="6" height="14" fill="#006B3F"/><rect x="248" y="0" width="4" height="14" fill="#FCD116"/><rect x="252" y="0" width="10" height="14" fill="#CE1126"/><rect x="262" y="0" width="4" height="14" fill="#000"/><rect x="266" y="0" width="14" height="14" fill="#FCD116"/><rect x="280" y="0" width="6" height="14" fill="#CE1126"/><rect x="286" y="0" width="4" height="14" fill="#FCD116"/><rect x="290" y="0" width="10" height="14" fill="#006B3F"/><rect x="300" y="0" width="4" height="14" fill="#000"/><rect x="304" y="0" width="14" height="14" fill="#FCD116"/><rect x="318" y="0" width="6" height="14" fill="#006B3F"/><rect x="324" y="0" width="4" height="14" fill="#FCD116"/><rect x="328" y="0" width="10" height="14" fill="#CE1126"/><rect x="338" y="0" width="4" height="14" fill="#000"/><rect x="342" y="0" width="14" height="14" fill="#FCD116"/><rect x="356" y="0" width="6" height="14" fill="#CE1126"/><rect x="362" y="0" width="4" height="14" fill="#FCD116"/><rect x="366" y="0" width="10" height="14" fill="#006B3F"/><rect x="376" y="0" width="4" height="14" fill="#000"/><rect x="380" y="0" width="14" height="14" fill="#FCD116"/><rect x="394" y="0" width="6" height="14" fill="#006B3F"/><rect x="400" y="0" width="4" height="14" fill="#FCD116"/><rect x="404" y="0" width="10" height="14" fill="#CE1126"/><rect x="414" y="0" width="4" height="14" fill="#000"/><rect x="418" y="0" width="14" height="14" fill="#FCD116"/><rect x="432" y="0" width="6" height="14" fill="#CE1126"/><rect x="438" y="0" width="4" height="14" fill="#FCD116"/><rect x="442" y="0" width="10" height="14" fill="#006B3F"/><rect x="452" y="0" width="4" height="14" fill="#000"/><rect x="0" y="5.5" width="400" height="3" fill="#000" opacity=".35"/></svg>`;
const BRAND=()=>`<div class="brandhead">${LOGO}<div><div class="wm">OnePlug</div><div class="tag">${t("appTagline")}</div></div></div>`;
/* ---------- per-device state ---------- */
const KEY="oneplug-africa-v1";
const defaults={bal:Object.fromEntries(Object.entries(COUNTRIES).map(([k,c])=>[k,c.welcome])),tx:Object.entries(COUNTRIES).map(([k,c])=>({cc:k,t:t("welcomeCreditWord"),a:c.welcome,d:Date.now()-864e5})),history:[],favs:[],vehicles:[{name:"My EV",vclass:"Car",battery:64,soc:34,limit:80,plugs:["CCS2","Type 2"]},{name:"My Okada",vclass:"Motorbike",range:90,soc:18,limit:100,plugs:[]}],vIdx:0};
let S=load();
function load(){try{const r=localStorage.getItem(KEY);return r?Object.assign(JSON.parse(JSON.stringify(defaults)),JSON.parse(r)):JSON.parse(JSON.stringify(defaults));}catch(e){return JSON.parse(JSON.stringify(defaults));}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const ghs=n=>money(n);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function km(a,b){const r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r;const x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(x));}
function mins(d){return Math.round(d/35*60);}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2300);}

const PREV=[["OnePlug — Country-Neutral App","Neutral badge and market stripes, Ghana stations only","https://claude.ai/artifact/3WRKNeti4oBtG2WMxKucGS"],
  ["OnePlug App Mockup","Design mockup: nearest-station card, holds, Countries screen","https://claude.ai/artifact/DhCd27Tt7GpC2rfLen6mWg"],
  ["OnePlug Ghana","Ghana-flag badge with the black star · the working app","https://claude.ai/artifact/43NABHGN8b2M8fADnh2Sxd"],
  ["OnePlug — Country-Neutral Brand","Master badge and country skins","https://claude.ai/artifact/Hcd4xYinefW97qes9m3DtH"]];
const avail=s=>s.conns.filter(c=>c.status==="available").length;
const sState=s=>avail(s)?"available":s.conns.every(c=>c.status==="offline")?"offline":"busy";
const col={available:"var(--charge)",busy:"var(--busy)",offline:"var(--off)",reserved:"var(--swap)"};
const veh=()=>S.vehicles[S.vIdx];
const counts=s=>({a:s.conns.filter(c=>c.status==="available").length,b:s.conns.filter(c=>c.status==="busy"||c.status==="reserved").length,o:s.conns.filter(c=>c.status==="offline").length});
function ring({a,b,o},size,big){const n=a+b+o,r=15.5,C=2*Math.PI*r,each=n<=16,g=n>1?(each?2.4:1.6):0;let off=0,arcs="";
  [[a,"var(--charge)"],[b,"var(--busy)"],[o,"var(--off)"]].forEach(([k,c])=>{if(!k)return;const parts=each?k:1,step=each?C/n:C*k/n;
    for(let i=0;i<parts;i++){const len=Math.max(step-g,.8);arcs+=`<circle r="${r}" cx="20" cy="20" fill="none" stroke="${c}" stroke-width="${big?4:5}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-(off+g/2)).toFixed(2)}" transform="rotate(-90 20 20)"/>`;off+=step;}});
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><circle r="18.5" cx="20" cy="20" fill="var(--surface)"/>${arcs}<text x="20" y="20.5" text-anchor="middle" dominant-baseline="central" font-size="${n>99?10:n>9?13:15}" font-weight="800" fill="var(--ink)">${n}</text></svg>`;}
const ringLabel=s=>{const k=counts(s);return s.kind==="swap"?t("ringLabelSwap",s.conns.length,k.a,k.b,k.o):t("ringLabelCharge",s.conns.length,k.a,k.b,k.o);};
const isSwapV=v=>v&&v.vclass&&v.vclass!=="Car";
const SLBL=s=>s.kind==="swap"?{available:"Full",busy:"Charging",offline:"Offline"}:{available:"Available",busy:"In use",offline:"Offline"};
const vRange=v=>isSwapV(v)?Math.round(v.soc/100*(v.range||90)):Math.round(v.soc/100*v.battery*6.5);
/* swap-station marker: rounded square in swap blue, battery gauge = share of full packs, number = full packs ready */
function tile({a,b,o},size,big){const n=a+b+o||1,f=a/n,c=a?"var(--charge)":b?"var(--busy)":"var(--off)";
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
  <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--surface)" stroke="var(--swap)" stroke-width="${big?2.6:3.4}"/>
  <rect x="11" y="7.5" width="16" height="8" rx="2" fill="none" stroke="var(--swap)" stroke-width="1.8"/><rect x="27.6" y="10" width="2" height="3" rx=".6" fill="var(--swap)"/>
  <rect x="12.7" y="9.2" width="${(12.6*Math.max(f,a?.12:0)).toFixed(2)}" height="4.6" rx="1" fill="${c}"/>
  <text x="20" y="27" text-anchor="middle" dominant-baseline="central" font-size="${a>9?12.5:14}" font-weight="800" fill="var(--ink)">${a}</text></svg>`;}
const marker=(s,size,big)=>s.kind==="swap"?tile(counts(s),size,big):ring(counts(s),size,big);

/* ---------- explore ---------- */
const F={q:"",kind:"all",avail:false,fast:false,plug:null,vc:null,op:null,fav:false,area:"gh"};
function setKind(k){F.kind=k;
  if(k==="swap"){F.fast=false;F.plug=null;}if(k==="charge")F.vc=null;
  if(F.op&&k!=="all"&&OPS[F.op].kind!==k)F.op=null;
  renderFilters();renderExplore();}
function renderFilters(){
  $("#kindseg").innerHTML=[["all",t("kindAll"),IC.all],["charge",t("kindCharging"),IC.bolt],["swap",t("kindSwap"),IC.batt]]
    .map(([k,l,i])=>`<button data-k="${k}" aria-pressed="${F.kind===k}">${i}${l}</button>`).join("");
  const sw=F.kind==="swap",ch=F.kind==="charge";
  $("#filters").innerHTML=`<button class="chip" data-f="avail" aria-pressed="${F.avail}">${sw?t("filterFullBatteries"):ch?t("filterAvailable"):t("filterAvailableNow")}</button>
  <button class="chip" data-f="fav" aria-pressed="${F.fav}">${t("filterSaved")}</button>
  ${sw?"":`<button class="chip" data-f="fast" aria-pressed="${F.fast}">50 kW+</button>`}
  ${sw?"":PLUGS.map(p=>`<button class="chip" data-plug="${p}" aria-pressed="${F.plug===p}">${p}</button>`).join("")}
  ${ch?"":VCLASSES.map(v=>`<button class="chip" data-vc="${v}" aria-pressed="${F.vc===v}">${vcl(v)}</button>`).join("")}
  ${Object.entries(OPS).filter(([k,o])=>o.cc===CC&&(F.kind==="all"||o.kind===F.kind)).map(([k,o])=>`<button class="chip" data-op="${k}" aria-pressed="${F.op===k}">${o.name}</button>`).join("")}`;
}
$("#kindseg").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setKind(b.dataset.k);});
$("#filters").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.f)F[b.dataset.f]=!F[b.dataset.f];else if(b.dataset.plug)F.plug=F.plug===b.dataset.plug?null:b.dataset.plug;
  else if(b.dataset.vc)F.vc=F.vc===b.dataset.vc?null:b.dataset.vc;else F.op=F.op===b.dataset.op?null:b.dataset.op;
  renderFilters();renderExplore();});
function renderLegend(){
  const sw=F.kind==="swap",ch=F.kind==="charge";
  const shapes=(sw?"":`<span class="shape"><span class="chipic">${IC.bolt}</span>${t("legendCharger")}</span>`)+(ch?"":`<span class="shape"><span class="chipic swap">${IC.batt}</span>${t("legendBatterySwap")}</span>`);
  $("#legend").innerHTML=`${shapes}<span><i style="background:var(--charge)"></i>${sw?t("stateFull"):ch?t("stateAvailable"):t("stateAvailOrFull")}</span><span><i style="background:var(--busy)"></i>${sw?t("stateCharging"):ch?t("stateInUse"):t("stateInUseOrCharging")}</span><span><i style="background:var(--off)"></i>${t("offline")}</span>`;}
$("#q").addEventListener("input",e=>{F.q=e.target.value.trim().toLowerCase();renderExplore();});

function filtered(){
  return STATIONS.filter(s=>{
    if(s.cc!==CC)return false;
    if(F.q&&!(s.name+" "+s.area+" "+OPS[s.op].name+" "+(s.kind==="swap"?"battery swap "+s.veh.join(" "):"charger")).toLowerCase().includes(F.q))return false;
    if(F.kind!=="all"&&s.kind!==F.kind)return false;
    if(F.avail&&!avail(s))return false;
    if(F.fast&&(s.kind!=="charge"||!s.conns.some(c=>c.kw>=50)))return false;
    if(F.plug&&(s.kind!=="charge"||!s.conns.some(c=>c.type===F.plug)))return false;
    if(F.vc&&(s.kind!=="swap"||!s.veh.includes(F.vc)))return false;
    if(F.op&&s.op!==F.op)return false;
    if(F.fav&&!S.favs.includes(s.id))return false;
    return true;}).map(s=>({...s,dist:km(ME,s)})).sort((a,b)=>a.dist-b.dist);
}
/* ---------- Google Maps ---------- */
let gmap=null,AME=null,clusterer=null,meMarker=null,markers={},currentList=[];
const GHANA_BOUNDS={north:11.2,south:4.7,west:-3.3,east:1.25};
function showMapNotice(html){$("#map").innerHTML=`<div class="map-notice">${html}</div>`;}
function refreshMapNoticeIfShown(){
  if(gmap||!$("#map").querySelector(".map-notice"))return;
  if(!GOOGLE_MAPS_API_KEY||GOOGLE_MAPS_API_KEY.startsWith("YOUR_"))showMapNotice(`<b>${t("mapNotConnectedTitle")}</b>${t("mapNotConnectedBody")}`);
}
function colorScheme(){const t=document.documentElement.dataset.theme;return t==="dark"?"DARK":t==="light"?"LIGHT":"FOLLOW_SYSTEM";}
function loadGoogleMaps(){
  if(!GOOGLE_MAPS_API_KEY||GOOGLE_MAPS_API_KEY.startsWith("YOUR_")){
    showMapNotice(`<b>${t("mapNotConnectedTitle")}</b>${t("mapNotConnectedBody")}`);return;}
  window.gm_authFailure=()=>showMapNotice(`<b>${t("mapsRejectedTitle")}</b>${t("mapsRejectedBody")}`);
  window.__gmInit=()=>initMap().catch(()=>showMapNotice(`<b>${t("mapCouldntLoadTitle")}</b>${t("mapCouldntLoadBodyA")}`));
  const sc=document.createElement("script");
  sc.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly&loading=async&callback=__gmInit`;
  sc.async=true;sc.onerror=()=>showMapNotice(`<b>${t("mapCouldntLoadTitle")}</b>${t("mapCouldntLoadBodyB")}`);
  document.head.appendChild(sc);
}
function pinEl(s){const d=document.createElement("div");
  if(s.kind==="swap"){d.className="gswap";d.innerHTML=tile(counts(s),40)+`<span class="kbadge swap">${IC.batt}</span>`;}
  else{d.className="gring";d.innerHTML=ring(counts(s),40)+`<span class="kbadge">${IC.bolt}</span>`;}
  return d;}
async function initMap(){
  const {Map}=await google.maps.importLibrary("maps");
  ({AdvancedMarkerElement:AME}=await google.maps.importLibrary("marker"));
  if(clusterer){clusterer.clearMarkers();clusterer=null;}
  $("#map").innerHTML="";
  gmap=new Map($("#map"),{center:{lat:7.9,lng:-1.0},zoom:6,mapId:GOOGLE_MAP_ID,colorScheme:colorScheme(),
    disableDefaultUI:true,clickableIcons:false,gestureHandling:"greedy"});
  fitGhana();
  const me=document.createElement("div");me.className="gme";
  meMarker=new AME({map:gmap,position:{lat:ME.lat,lng:ME.lng},content:me,title:LANG==="fr"?"Vous":"You",zIndex:999});
  markers={};
  STATIONS.forEach(s=>{
    const m=new AME({position:{lat:s.lat,lng:s.lng},title:`${s.name}: ${ringLabel(s)}`,content:pinEl(s),gmpClickable:true});
    m.__s=s;m.addListener("click",()=>openStation(s.id));markers[s.id]=m;});
  if(window.markerClusterer){
    clusterer=new markerClusterer.MarkerClusterer({map:gmap,markers:[],renderer:{render:({count,position,markers:ms})=>{
      const tot=ms.reduce((acc,m)=>{const c=counts(m.__s);acc.a+=c.a;acc.b+=c.b;acc.o+=c.o;return acc;},{a:0,b:0,o:0}),el=document.createElement("div");
      el.className="gring";el.innerHTML=ring(tot,52);
      return new AME({position,content:el,title:t("clusterTitle",count,tot.a,tot.b,tot.o),zIndex:1000+count});}}});
  }
  renderMap(currentList.length?currentList:filtered());
}
function renderMap(list){
  currentList=list;if(!gmap)return;
  const show=new Set(list.map(s=>s.id)),vis=[];
  STATIONS.forEach(s=>{const m=markers[s.id];if(!m)return;m.content=pinEl(s);m.title=`${s.name}: ${ringLabel(s)}`;
    if(show.has(s.id))vis.push(m);else if(!clusterer)m.map=null;});
  if(clusterer){clusterer.clearMarkers(true);clusterer.addMarkers(vis);}
  else vis.forEach(m=>m.map=gmap);
}
function fitGhana(){if(gmap)gmap.fitBounds(C().bounds,{top:190,bottom:40,left:10,right:60});}
$("#fitBtn").onclick=fitGhana;
$("#zin").onclick=()=>gmap&&gmap.setZoom(gmap.getZoom()+1);
$("#zout").onclick=()=>gmap&&gmap.setZoom(gmap.getZoom()-1);
$("#meBtn").onclick=()=>{
  const goMe=()=>{if(!gmap)return;gmap.panTo({lat:ME.lat,lng:ME.lng});gmap.setZoom(13);};
  if(!navigator.geolocation){toast(t("locUnavailableShowing",C().city));goMe();return;}
  navigator.geolocation.getCurrentPosition(p=>{ME.lat=p.coords.latitude;ME.lng=p.coords.longitude;
      if(meMarker)meMarker.position={lat:ME.lat,lng:ME.lng};renderExplore();goMe();},
    ()=>{toast(t("locOffShowing",C().city));goMe();},{enableHighAccuracy:true,timeout:8000});
};
async function initMini(s){
  const el=$("#mini");if(!el)return;
  if(!gmap){el.style.display="none";return;}
  const {Map}=await google.maps.importLibrary("maps");
  const mm=new Map(el,{center:{lat:s.lat,lng:s.lng},zoom:15,mapId:GOOGLE_MAP_ID,colorScheme:colorScheme(),
    disableDefaultUI:true,gestureHandling:"none",keyboardShortcuts:false,clickableIcons:false});
  new AME({map:mm,position:{lat:s.lat,lng:s.lng},content:pinEl(s)});
}
function bars(s){return `<div class="bars" aria-hidden="true">${s.conns.map(c=>`<i class="${c.status==="available"?"on":c.status==="busy"||c.status==="reserved"?"bz":"of"}"></i>`).join("")}</div>`;}
function renderExplore(){
  const list=filtered();renderMap(list);
  const nc=list.filter(s=>s.kind==="charge").length,ns=list.length-nc;renderLegend();renderHero();
  $("#netLabel").textContent=F.kind==="charge"?t("netLabelCharge",nc):F.kind==="swap"?t("netLabelSwap",ns):t("netLabelBoth",nc,ns);
  $("#list").innerHTML=list.length?list.map(s=>{const k=counts(s);
    if(s.kind==="swap")return `<button class="st-card swap" data-id="${s.id}">
      <span><h3>${esc(s.name)}<span class="tag-kind">${IC.batt}${t("batterySwapWord")}</span></h3><div class="st-sub">${OPS[s.op].name} · <span class="stars">★</span>${rtg(s).avg.toFixed(1)} · ${s.dist<1?"<1":s.dist.toFixed(0)} km · ${mins(s.dist)} min · ${s.veh.map(vcl).join(", ")}</div><div class="st-sub">${t("countFullCharging",k.a,k.b,k.o)}</div></span>
      <span class="stalls" role="img" aria-label="${ringLabel(s)}"><span style="display:flex;justify-content:flex-end"><span class="gswap" style="filter:none;cursor:inherit">${tile(k,46)}<span class="kbadge swap">${IC.batt}</span></span></span><div class="lbl">${ghs(s.price)}${t("perSwap")}</div></span>
    </button>`;
    const mx=Math.max(...s.conns.map(c=>c.kw));
    return `<button class="st-card" data-id="${s.id}">
      <span><h3>${esc(s.name)}<span class="tag-kind charge">${IC.bolt}${t("chargingWord")}</span></h3><div class="st-sub">${OPS[s.op].name} · <span class="stars">★</span>${rtg(s).avg.toFixed(1)} · ${s.dist<1?"<1":s.dist.toFixed(0)} km · ${mins(s.dist)} min · ${t("upToKw",mx)}</div><div class="st-sub">${t("countAvailInUse",counts(s).a,counts(s).b,counts(s).o)}</div></span>
      <span class="stalls" role="img" aria-label="${ringLabel(s)}"><span style="display:flex;justify-content:flex-end"><span class="gring" style="filter:none;cursor:inherit">${ring(counts(s),46)}<span class="kbadge">${IC.bolt}</span></span></span><div class="lbl">${ghs(s.price)}${t("perKwh")}</div></span>
    </button>`;}).join(""):`<div class="empty">${t("noStationsMatch")}</div>`;
}
$("#list").addEventListener("click",e=>{const b=e.target.closest(".st-card");if(b)openStation(b.dataset.id);});

/* ---------- full-screen page ---------- */
let lastFocus=null;
function openPage(html,dock){lastFocus=document.activeElement;$("#pageBody").innerHTML=html;$("#page").classList.add("open");$("#page").scrollTop=0;
  if(dock){$("#dockBody").innerHTML=dock;$("#dock").classList.add("open");}else $("#dock").classList.remove("open");
  document.body.style.overflow="hidden";setTimeout(()=>{const f=$("#pageBody").querySelector("button,input");f&&f.focus();},30);}
function closePage(){$("#page").classList.remove("open");$("#dock").classList.remove("open");document.body.style.overflow="";lastFocus&&lastFocus.focus&&lastFocus.focus();}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#page").classList.contains("open"))closePage();});
const backBtn=()=>`<button class="iconbtn" data-close aria-label="${t("backAria")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg></button>`;
document.addEventListener("click",e=>{if(e.target.closest("[data-close]"))closePage();});

/* ---------- server calls ---------- */
async function postJSON(path,body){const r=await fetch(API+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  let j=null;try{j=await r.json();}catch(e){}if(!r.ok)throw new Error((j&&j.error)||`Request failed (${r.status})`);return j;}
/* merge fresh community data from the server without touching live connector state (holds, sessions) */
function applyStation(st){const s=STATIONS.find(x=>x.id===st.id);if(!s)return;s.r0=st.r0;s.n0=st.n0;s.reports=st.reports;s.confirmedAt=st.confirmedAt;}
/* ---------- ratings, problem reports & status freshness ---------- */
/* The first item of each pair is sent to the server as-is (it validates this exact English text);
   the second is only the displayed label. */
const ISSUES={charge:[["Charger not working","Chargeur en panne"],["Status shown is wrong","Le statut affiché est erroné"],["Blocked by a petrol car","Bloqué par une voiture à essence"],["Payment failed","Paiement échoué"],["Cable damaged","Câble endommagé"],["Station closed","Station fermée"]],
  swap:[["No full batteries","Aucune batterie pleine"],["Battery wouldn't release","La batterie ne se libère pas"],["Status shown is wrong","Le statut affiché est erroné"],["Payment failed","Paiement échoué"],["Station closed","Station fermée"]]};
function rtg(s){const mine=(S.reviews||{})[s.id]||[];return {avg:s.r0,n:s.n0,mine};}
function ago(ts){const m=Math.max(1,Math.round((Date.now()-ts)/6e4));return m<60?t("agoMin",m):m<1440?t("agoHour",Math.round(m/60)):t("agoDay",Math.round(m/1440));}
function freshLine(s){const c=(S.confirms||{})[s.id],base=Date.now()-s.upd*6e4,sc=s.confirmedAt||0;const ts=Math.max(base,c||0,sc);
  return `${t("updatedPrefix")} ${ago(ts)} · ${c&&c===ts?t("confirmedByYou"):sc&&sc===ts?t("confirmedByDriver"):t("liveFrom",esc(OPS[s.op].name))}`;}
function starStr(a){const f=Math.round(a);return "★".repeat(f)+"☆".repeat(5-f);}
function communityBlock(s){const r=rtg(s),reps=(s.reports||[]).filter(x=>x.d>Date.now()-864e5*3),open=CMOPEN.has(s.id);
  return `<button class="cm-toggle" data-cm="toggle" data-sid="${s.id}" aria-expanded="${open}" aria-controls="cmPanel">
    <span class="grow"><span class="cm-t">${t("ratingsReportsTitle")}</span>
    <span class="cm-sum"><span class="stars">★</span> ${r.avg.toFixed(1)} · ${t("ratingsCountLbl",r.n)}${reps.length?` · <span class="cm-badge">${t("problemsReported",reps.length)}</span>`:` · ${t("noProblemsShort")}`}</span></span>
    <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
  <div id="cmPanel" class="cm-panel"${open?"":" hidden"}>
  <div class="group">
    <div class="row"><span class="cm-rate"><b>${r.avg.toFixed(1)}</b><span class="stars" aria-label="${t("starsOutOf5Aria",r.avg.toFixed(1))}">${starStr(r.avg)}</span></span><span class="muted">${t("ratingsCountLbl",r.n)}</span></div>
    ${reps.length?reps.slice(-3).reverse().map(x=>`<div class="row rep-item"><span><i class="stat-dot" style="background:var(--rep-strong)"></i></span><span class="grow"><b>${esc(ISSUES[s.kind].find(p=>p[0]===x.issue)?.[LANG==="fr"?1:0]||x.issue)}</b><div class="st-sub">${t("reportedAgoPrefix")} ${ago(x.d)}${x.note?" · "+esc(x.note):""}</div>${x.units&&x.units.length?`<div class="rep-units">${x.units.map(u=>`<span>${esc(u)}</span>`).join("")}</div>`:""}${x.photos&&x.photos.length?`<div class="rep-thumbs">${x.photos.map((p,i)=>`<img src="${p}" alt="${t("photoAlt",i+1)}">`).join("")}</div>`:""}</span></div>`).join(""):`<div class="row"><span class="muted">${t("noProblems3d")}</span></div>`}
    ${r.mine.slice(-2).reverse().map(x=>`<div class="row"><span class="grow"><span class="stars">${starStr(x.r)}</span><div class="st-sub">${t("yourRatingPrefix")} · ${ago(x.d)}${x.t?" · “"+esc(x.t)+"”":""}</div></span></div>`).join("")}
  </div>
  <div class="cm-actions">
    <button class="btn soft" data-cm="rate" data-sid="${s.id}">★ ${t("rateStationBtn")}</button>
    <button class="btn soft rep-btn" data-cm="report" data-sid="${s.id}">${RIC.alert}${t("reportProblemBtn")}</button>
  </div>
  <button class="btn soft block" data-cm="ok" data-sid="${s.id}" style="margin-bottom:8px">✓ ${t("statusLooksRight")}</button>
  <div id="cmBox"></div></div>`;}
const CM={stars:0,issue:null,units:new Set(),photos:[]};
const CMOPEN=new Set();
const RIC={alert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  wand:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 4 5 5L9 20H4v-5z"/><path d="M19 2v3M20.5 3.5h-3"/></svg>`,
  cam:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>`,
  x:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  tick:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>`};
const unitName=(s,c)=>s.kind==="swap"?t("unitSlot",c.slot):t("unitCharger",c.id.split("-").pop());
const unitSub=(s,c)=>(s.kind==="swap"?"":`${c.type} · `)+({available:s.kind==="swap"?t("unitFull"):t("unitFreeConn"),busy:s.kind==="swap"?t("unitCharging"):t("unitInUse"),offline:t("unitOffline"),reserved:t("unitHeld")}[c.status]||"");
function autoUnits(s){
  if(HOLD&&HOLD.sid===s.id)return {ids:[HOLD.cid],why:t("reasonHolding")};
  const last=S.history.find(h=>h.station===s.name&&(h.cid||h.slot));
  if(last){const c=last.cid?s.conns.find(c=>c.id===last.cid):s.conns.find(c=>c.slot===last.slot);if(c)return {ids:[c.id],why:t("reasonLastUsed")};}
  const off=s.conns.filter(c=>c.status==="offline").map(c=>c.id);
  if(off.length)return {ids:off,why:off.length>1?t("reasonOfflineMany"):t("reasonOfflineOne")};
  return {ids:[],why:""};}
function reportHTML(s){const id=s.id,sw=s.kind==="swap";
  return `<div class="rep-card" role="group" aria-label="${t("reportTitle")}">
    <div class="rep-head"><span class="ic">${RIC.alert}</span><div><h3>${t("reportTitle")}</h3><p>${t("reportGoesTo",esc(OPS[s.op].name),esc(s.name))}</p></div></div>
    <div class="rep-body">
      <div class="rep-step"><span><span class="n">1</span>${sw?t("whichBatteriesQ"):t("whichChargersQ")}</span><button class="auto" data-cm="auto" data-sid="${id}">${RIC.wand}${t("autoSelectBtn")}</button></div>
      <div class="units" role="group" aria-label="${sw?t("affectedBatterySlotsAria"):t("affectedChargersAria")}">${s.conns.map(c=>`<button class="unit" data-cm="unit" data-sid="${id}" data-u="${c.id}" aria-pressed="false"><b>${unitName(s,c)}</b>${unitSub(s,c)}<i class="sd" style="background:${col[c.status]}"></i><span class="tick">${RIC.tick}</span></button>`).join("")}</div>
      <div class="rep-step"><span><span class="n">2</span>${t("whatsWrongQ")}</span></div>
      <div class="issue">${ISSUES[s.kind].map(x=>`<button data-cm="issue" data-sid="${id}" data-i="${esc(x[0])}" aria-pressed="false">${esc(x[LANG==="fr"?1:0])}</button>`).join("")}</div>
      <div class="rep-step"><span><span class="n">3</span>${t("addPhotosQ")}</span><span class="opt-l">${t("optionalUpTo3")}</span></div>
      <div class="photos" id="repPhotos"></div>
      <textarea id="cmText" maxlength="200" placeholder="${t("reportNotePlaceholder")}"></textarea>
      <button class="btn block rep-send" data-cm="sendRep" data-sid="${id}" style="margin-top:12px" disabled>${t("pickWhatsWrong")}</button>
    </div></div>`;}
function drawPhotos(){const el=$("#repPhotos");if(!el)return;
  el.innerHTML=CM.photos.map((p,i)=>`<div class="ph"><img src="${p}" alt="${t("photoAlt",i+1)}"><button type="button" data-cm="phdel" data-i="${i}" aria-label="${t("removePhotoAria",i+1)}">${RIC.x}</button></div>`).join("")
    +(CM.photos.length<3?`<label class="addph">${RIC.cam}${CM.photos.length?t("addMorePhotos"):t("addPhoto")}<input type="file" id="repPhoto" accept="image/*" multiple aria-label="${t("addPhotoOfProblemAria")}"></label>`:"");}
function addPhotos(files){[...files].filter(f=>f.type.startsWith("image/")).slice(0,3-CM.photos.length).forEach(f=>{
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{if(CM.photos.length>=3)return;const k=Math.min(1,480/Math.max(im.width,im.height)),cv=document.createElement("canvas");
    cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);CM.photos.push(cv.toDataURL("image/jpeg",.72));drawPhotos();updateSend();};im.src=r.result;};r.readAsDataURL(f);});}
document.addEventListener("change",e=>{if(e.target.id==="repPhoto"&&e.target.files.length)addPhotos(e.target.files);});
function updateSend(){const btn=$("#cmBox [data-cm=sendRep]");if(!btn)return;const s=STATIONS.find(x=>x.id===btn.dataset.sid),n=CM.units.size,sw=s.kind==="swap";
  const what=n?` · ${n} ${sw?t("unitWordBattery",n):t("unitWordCharger",n)}`:"",pics=CM.photos.length?` · ${t("photoWord",CM.photos.length)}`:"";
  btn.disabled=!CM.issue;btn.textContent=CM.issue?`${t("sendReport")}${what}${pics}`:t("pickWhatsWrong");}
function syncUnits(){document.querySelectorAll("#cmBox [data-cm=unit]").forEach(x=>x.setAttribute("aria-pressed",CM.units.has(x.dataset.u)));updateSend();}
function reopen(id){const s=STATIONS.find(x=>x.id===id);s.kind==="swap"?openSwapStation(id):openStation(id);}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-cm]");if(!b)return;const id=b.dataset.sid,s=STATIONS.find(x=>x.id===id),box=$("#cmBox"),act=b.dataset.cm;
  if(act==="toggle"){const o=!CMOPEN.has(id);o?CMOPEN.add(id):CMOPEN.delete(id);b.setAttribute("aria-expanded",o);$("#cmPanel").hidden=!o;if(o)b.scrollIntoView({behavior:"smooth",block:"start"});return;}
  if(act==="rate"){CM.stars=0;box.innerHTML=`<div class="cm-box"><h3>${t("rateStationTitle",esc(s.name))}</h3>
      <div class="star-pick" role="radiogroup" aria-label="${LANG==="fr"?"Étoiles":"Stars"}">${[1,2,3,4,5].map(n=>`<button data-cm="star" data-sid="${id}" data-n="${n}" aria-pressed="false" aria-label="${t("starAria",n)}">★</button>`).join("")}</div>
      <textarea id="cmText" maxlength="160" placeholder="${t("rateNotePlaceholder")}"></textarea>
      <button class="btn block" data-cm="sendRate" data-sid="${id}" style="margin-top:10px" disabled>${t("submitRating")}</button></div>`;box.scrollIntoView({behavior:"smooth",block:"nearest"});}
  else if(act==="star"){CM.stars=+b.dataset.n;box.querySelectorAll("[data-cm=star]").forEach(x=>x.setAttribute("aria-pressed",+x.dataset.n<=CM.stars));box.querySelector("[data-cm=sendRate]").disabled=false;}
  else if(act==="sendRate"){const txt=($("#cmText").value||"").trim(),r=CM.stars;b.disabled=true;
    postJSON(`/stations/${encodeURIComponent(id)}/reviews`,{stars:r,text:txt}).then(st=>{applyStation(st);S.reviews=S.reviews||{};(S.reviews[id]=S.reviews[id]||[]).push({r,t:txt,d:Date.now()});save();reopen(id);toast(t("thanksForRating",s.name));})
      .catch(err=>{b.disabled=false;toast(err.message||t("couldntSendRating"));});}
  else if(act==="report"){CM.issue=null;CM.units=new Set();CM.photos=[];box.innerHTML=reportHTML(s);drawPhotos();box.scrollIntoView({behavior:"smooth",block:"start"});}
  else if(act==="unit"){const u=b.dataset.u;CM.units.has(u)?CM.units.delete(u):CM.units.add(u);syncUnits();}
  else if(act==="auto"){const a=autoUnits(s);if(!a.ids.length){toast(s.kind==="swap"?t("nothingStandsOutBatteries"):t("nothingStandsOutChargers"));return;}
    CM.units=new Set(a.ids);syncUnits();toast(t("selectedToast",a.ids.map(u=>unitName(s,s.conns.find(c=>c.id===u))).join(", "),a.why));}
  else if(act==="phdel"){CM.photos.splice(+b.dataset.i,1);drawPhotos();updateSend();}
  else if(act==="issue"){CM.issue=b.dataset.i;box.querySelectorAll("[data-cm=issue]").forEach(x=>x.setAttribute("aria-pressed",x===b));updateSend();}
  else if(act==="sendRep"){const units=[...CM.units].map(u=>unitName(s,s.conns.find(c=>c.id===u))),n=CM.photos.length;
    b.disabled=true;
    postJSON(`/stations/${encodeURIComponent(id)}/reports`,{issue:CM.issue,units,photos:CM.photos.slice(),note:(($("#cmText")||{}).value||"").trim()}).then(st=>{applyStation(st);reopen(id);
    toast(t("reportSent",OPS[s.op].name,units.length?units.join(", "):"",n));})
      .catch(err=>{b.disabled=false;toast(err.message||t("couldntSendReport"));});}
  else if(act==="ok"){b.disabled=true;postJSON(`/stations/${encodeURIComponent(id)}/confirm`,{}).then(st=>{applyStation(st);S.confirms=S.confirms||{};S.confirms[id]=Date.now();save();reopen(id);toast(t("statusConfirmedToast"));})
      .catch(err=>{b.disabled=false;toast(err.message||t("couldntConfirm"));});}
});

function openStation(id,sel){
  const s=STATIONS.find(x=>x.id===id),v=veh(),fav=S.favs.includes(id),d=km(ME,s);
  if(s.kind==="swap")return openSwapStation(id);
  const ok=c=>(c.status==="available"||(HOLD&&HOLD.cid===c.id))&&v.plugs.includes(c.type);
  if(!sel&&HOLD&&HOLD.sid===id)sel=HOLD.cid;
  if(!sel){const f=s.conns.filter(ok).sort((a,b)=>b.kw-a.kw)[0];sel=f&&f.id;}
  openPage(`
    <div class="topbar">${backBtn()}
      <button class="iconbtn" id="favBtn" aria-label="${fav?t("removeFromSaved"):t("saveStation")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="${fav?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 17.3 5.8 21l1.6-7L2 9.3l7.2-.6L12 2l2.8 6.7 7.2.6-5.4 4.7 1.6 7z"/></svg></button></div>
    <div class="kind-banner"><span class="ic">${IC.bolt}</span>${t("chargingStationBanner")}</div>
    <div class="muted">${t("networkSuffix",OPS[s.op].name)}</div>
    <h1 class="hero-name">${esc(s.name)}</h1>
    <div class="ring-hero" role="img" aria-label="${ringLabel(s)}"><span class="mk">${ring(counts(s),96,true)}<span class="kbadge big-badge">${IC.bolt}</span></span><div class="counts">
      <span><i class="stat-dot" style="background:var(--charge)"></i><b>${counts(s).a}</b> ${t("available")}</span>
      <span><i class="stat-dot" style="background:var(--busy)"></i><b>${counts(s).b}</b> ${t("inUse")}</span>
      <span><i class="stat-dot" style="background:var(--off)"></i><b>${counts(s).o}</b> ${t("offline")}</span><span class="fresh">${freshLine(s)}</span></div></div>
    <div class="minimap" id="mini" aria-hidden="true"></div>
    <div class="group">
      <div class="row"><span class="muted">${t("priceLbl")}</span><b>${t("perKwhPrice",ghs(s.price))}</b></div>
      <div class="row"><span class="muted">${t("distanceLbl")}</span><b>${d.toFixed(1)} km · ${mins(d)} min</b></div>
      <div class="row"><span class="muted">${t("hoursLbl")}</span><b>${esc(s.hours)}</b></div>
      <div class="row"><span class="muted">${t("nearbyLbl")}</span><b style="text-align:right">${esc(s.amen)}</b></div>
    </div>
    <div class="sec-title">${t("chooseChargerTitle")}</div>
    <div class="group" role="radiogroup" aria-label="${t("chooseChargerTitle")}">
      ${s.conns.map(c=>{const fits=v.plugs.includes(c.type);return `<button class="conn" role="radio" data-c="${c.id}" aria-pressed="${sel===c.id}" aria-checked="${sel===c.id}" ${ok(c)?"":"disabled"}>
        <span class="radio"></span><span class="grow"><b>${c.type} · ${c.kw} kW</b><div class="st-sub">${c.id}${fits?"":t("doesntFit",esc(v.name))}</div></span>
        <span class="st-sub"><i class="stat-dot" style="background:${col[c.status]}"></i>${c.status==="available"?t("available"):c.status==="busy"?t("inUse"):c.status==="reserved"?t("heldForYouStatus"):t("offline")}</span></button>`;}).join("")}
    </div>
    ${communityBlock(s)}
    <p class="note">${t("noAccountNeededCharge",OPS[s.op].name)}</p>`,
  `<a class="btn soft" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">${t("navigate")}</a>
   <button class="btn block" id="startBtn" ${sel?"":"disabled"}>${sel?t("startCharging"):isSwapV(v)?t("usesBatterySwap",vcl(v.vclass)):t("noCompatibleCharger")}</button>`);
  initMini(s);
  $("#favBtn").onclick=()=>{fav?S.favs=S.favs.filter(x=>x!==id):S.favs.push(id);save();openStation(id,sel);toast(fav?t("removedFromSaved"):t("saved"));};
  $("#pageBody").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>openStation(id,b.dataset.c));
  $("#startBtn").onclick=()=>{const c=s.conns.find(c=>c.id===sel);const need=Math.max(0,(v.limit-v.soc)/100*v.battery)*s.price;
    if(S.bal[CC]<Math.min(need,s.price*4)){toast(t("topUpToStart"));closePage();go("wallet");openTopup();return;}
    closePage();startSession(s,c);};
}

/* ---------- battery swap ---------- */
const favIcon=fav=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="${fav?"currentColor":"none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 17.3 5.8 21l1.6-7L2 9.3l7.2-.6L12 2l2.8 6.7 7.2.6-5.4 4.7 1.6 7z"/></svg>`;
const vcl=v=>v==="Motorbike"?t("vclMotorbike"):v==="Tricycle"?t("vclTricycle"):v;
function slotGrid(s,pick){return `<div class="slotgrid" role="img" aria-label="${ringLabel(s)}">${s.conns.map(c=>`<div class="slot ${c.status==="available"?"full":c.status==="busy"?"chg":"off"}${pick===c.id?" pick":""}"><span class="cell"><i></i></span>${c.slot}</div>`).join("")}</div>`;}
function openSwapStation(id){
  const s=STATIONS.find(x=>x.id===id),v=veh(),fav=S.favs.includes(id),d=km(ME,s),k=counts(s);
  const mine=S.vehicles.map((x,i)=>[x,i]).filter(([x])=>isSwapV(x));
  const fits=isSwapV(v)&&s.veh.includes(v.vclass),held=HOLD&&HOLD.sid===id,can=fits&&(k.a>0||held);
  openPage(`
    <div class="topbar">${backBtn()}<button class="iconbtn" id="favBtn" aria-label="${fav?t("removeFromSaved"):t("saveStation")}">${favIcon(fav)}</button></div>
    <div class="kind-banner swap"><span class="ic">${IC.batt}</span>${t("batterySwapStationBanner")}</div>
    <div class="muted">${t("networkSuffix",OPS[s.op].name)}</div>
    <h1 class="hero-name">${esc(s.name)}</h1>
    <div class="ring-hero" role="img" aria-label="${ringLabel(s)}"><span class="mk">${tile(k,96,true)}<span class="kbadge swap big-badge">${IC.batt}</span></span><div class="counts">
      <span><i class="stat-dot" style="background:var(--charge)"></i><b>${k.a}</b> ${t("fullBatteriesWord")}</span>
      <span><i class="stat-dot" style="background:var(--busy)"></i><b>${k.b}</b> ${t("stateCharging")}</span>
      <span><i class="stat-dot" style="background:var(--off)"></i><b>${k.o}</b> ${t("offline")}</span><span class="fresh">${freshLine(s)}</span></div></div>
    <div class="minimap" id="mini" aria-hidden="true"></div>
    <div class="group">
      <div class="row"><span class="muted">${t("swapPriceLbl")}</span><b>${t("perSwapPrice",ghs(s.price))}</b></div>
      <div class="row"><span class="muted">${t("swapTimeLbl")}</span><b>${t("about2min")}</b></div>
      <div class="row"><span class="muted">${t("vehiclesLbl")}</span><b>${s.veh.map(vcl).join(", ")}</b></div>
      <div class="row"><span class="muted">${t("batteryPackLbl")}</span><b>${esc(s.pack)}</b></div>
      <div class="row"><span class="muted">${t("distanceLbl")}</span><b>${d.toFixed(1)} km · ${mins(d)} min</b></div>
      <div class="row"><span class="muted">${t("hoursLbl")}</span><b>${esc(s.hours)}</b></div>
      <div class="row"><span class="muted">${t("nearbyLbl")}</span><b style="text-align:right">${esc(s.amen)}</b></div>
    </div>
    <div class="sec-title">${t("batterySlotsTitle")}</div>
    ${slotGrid(s)}
    <div class="sec-title">${t("swappingForTitle")}</div>
    ${mine.length?`<div class="group" role="radiogroup" aria-label="${t("vehiclesLbl")}">${mine.map(([x,i])=>{const ok=s.veh.includes(x.vclass);return `<button class="conn" role="radio" data-v="${i}" aria-pressed="${i===S.vIdx}" aria-checked="${i===S.vIdx}">
        <span class="radio"></span><span class="grow"><b>${esc(x.name)}</b><div class="st-sub">${vcl(x.vclass)} · ${x.soc}% battery${ok?"":t("notSupportedHere")}</div></span></button>`;}).join("")}</div>`
      :`<p class="note">${t("swapOnlyNote")}</p>`}
    ${communityBlock(s)}
    <p class="note">${t("swapAccountNote",OPS[s.op].name)}</p>`,
  `<a class="btn soft" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">${t("navigate")}</a>
   <button class="btn block" id="swapBtn" ${can?"":"disabled"}>${can?t("swapBtnReady",ghs(s.price)):!isSwapV(v)?t("pickSwapVehicle"):!fits?t("noPacksHere",vcl(v.vclass)):t("noFullBatteries")}</button>`);
  initMini(s);
  $("#favBtn").onclick=()=>{fav?S.favs=S.favs.filter(x=>x!==id):S.favs.push(id);save();openSwapStation(id);toast(fav?t("removedFromSaved"):t("saved"));};
  $("#pageBody").querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{if(SES)return toast(t("stopChargingFirst"));S.vIdx=+b.dataset.v;save();openSwapStation(id);});
  $("#swapBtn").onclick=()=>{if(S.bal[CC]<s.price){toast(t("topUpToSwap"));closePage();go("wallet");openTopup();return;}runSwap(s);};
}
function runSwap(s){
  const v=veh(),take=(HOLD&&HOLD.sid===s.id&&s.conns.find(c=>c.id===HOLD.cid))||s.conns.find(c=>c.status==="available"),from=v.soc;
  take.status="reserved";HOLD=null;
  const steps=[t("stepReserved",take.slot),t("stepSwitchOff",vcl(v.vclass)),t("stepOpens",take.slot),t("stepPaid",ghs(s.price))];
  let n=0;
  const draw=()=>{openPage(`<div class="topbar"><span></span><span></span></div>
    <div class="muted">${OPS[s.op].name} · ${esc(s.name)}</div>
    <h1 class="hero-name">${n<steps.length?t("swappingBatteryTitle"):t("swapCompleteTitle")}</h1>
    ${slotGrid(s,take.id)}
    <ol class="steps">${steps.map((st,i)=>`<li class="${i<n?"done":i===n?"now":""}"><span class="dot">${i<n?"✓":i+1}</span>${st}</li>`).join("")}</ol>
    ${n<steps.length?`<p class="note">${t("demoAutoNote")}</p>`:`
    <div class="sec-title">${t("receiptTitle")}</div>
    <div class="group">
      <div class="row"><span class="muted">${t("vehicleLbl")}</span><b>${esc(v.name)}</b></div>
      <div class="row"><span class="muted">${t("batteryPackLbl")}</span><b class="num">${from}% → 100%</b></div>
      <div class="row"><span class="muted">${t("rangeNowTitle")}</span><b class="num">${t("rangeNowLbl",v.range||90)}</b></div>
      <div class="row"><span class="muted">${t("networkLbl")}</span><b>${OPS[s.op].name}</b></div>
      <div class="row"><span class="muted">${t("paidFromWalletLbl")}</span><b class="num">${ghs(s.price)}</b></div>
    </div>`}`,n<steps.length?null:`<button class="btn block" id="swapDone">${t("done")}</button>`);
    if(n>=steps.length)$("#swapDone").onclick=()=>{closePage();go("charge");};};
  const step=()=>{n++;
    if(n===steps.length){take.status="busy";v.soc=100;S.bal[CC]-=s.price;
      S.history.unshift({cc:CC,kind:"swap",id:"S"+Date.now().toString().slice(-6),station:s.name,op:OPS[s.op].name,cost:s.price,kwh:0,d:Date.now(),from,soc:100,slot:take.slot});
      S.tx.unshift({cc:CC,t:s.name,sub:t("batterySwapWord")+" · "+OPS[s.op].name,a:-s.price,d:Date.now()});save();renderExplore();}
    draw();if(n<steps.length)setTimeout(step,1000);};
  draw();setTimeout(step,1000);
}

/* ---------- charging session ---------- */
let SES=null,timer=null,receipt=null;
function startSession(s,c){
  const v=veh();if(HOLD&&HOLD.cid===c.id)HOLD=null;c.status="busy";receipt=null;
  SES={s,c,v,startSoc:v.soc,soc:v.soc,kwh:0,start:Date.now(),kw:0,ramp:0};
  timer=setInterval(tick,500);go("charge");renderExplore();toast(t("chargingAt",s.name));
}
function peak(){const {c,soc}=SES;const base=c.type==="Type 2"?Math.min(c.kw,11):c.kw;return base*(soc<50?1:soc<70?0.75:soc<85?0.45:0.2);}
function tick(){
  SES.ramp=Math.min(1,SES.ramp+0.25);
  SES.kw=peak()*SES.ramp*(0.96+Math.random()*0.06);
  const add=SES.kw*(3/60)/2; // 1s ≈ 3 min
  SES.kwh+=add;SES.soc=Math.min(100,SES.startSoc+SES.kwh/SES.v.battery*100);
  const cost=SES.kwh*SES.s.price;
  if(SES.soc>=SES.v.limit||cost>=S.bal[CC]){stopSession(SES.soc>=SES.v.limit?t("reachedLimit"):t("walletUsedUp"));return;}
  renderCharge();
}
function stopSession(reason){
  clearInterval(timer);timer=null;
  const {s,c,kwh,v}=SES,cost=Math.min(S.bal[CC],kwh*s.price);
  S.bal[CC]-=cost;v.soc=Math.round(SES.soc);
  const r={cc:CC,cid:c.id,kind:"charge",id:"R"+Date.now().toString().slice(-6),station:s.name,op:OPS[s.op].name,plug:c.type+" · "+c.kw+" kW",kwh,cost,mins:Math.round((Date.now()-SES.start)/1000*3),d:Date.now(),from:SES.startSoc,soc:v.soc,reason};
  S.history.unshift(r);S.tx.unshift({cc:CC,t:s.name,sub:t("chargingWord")+" · "+OPS[s.op].name,a:-cost,d:Date.now()});
  c.status="available";SES=null;receipt=r;save();renderExplore();go("charge");
}
function batteryBar(soc,limit,charging){
  return `<div class="battery" role="img" aria-label="${t("batteryAria",Math.floor(soc),limit)}">
    <div class="fill ${charging?"charging":""}" style="width:${soc}%"></div><div class="limit" style="left:calc(${limit}% - 1.5px)"></div></div>`;
}
function renderCharge(){
  const el=$("#v-charge");$("#liveDot").style.display=SES?"inline-block":"none";
  const v=veh();
  if(SES){
    const {s,c}=SES,cost=SES.kwh*s.price,left=Math.max(0,(v.limit-SES.soc)/100*v.battery),eta=SES.kw>0?Math.round(left/Math.max(SES.kw*0.7,1)*60):0;
    el.innerHTML=`<div class="screen">${BRAND()}<div class="car-stage">
      <div class="car-name">${esc(v.name)} · ${esc(s.name)}</div>
      <div class="soc-big num">${Math.floor(SES.soc)}<sup>%</sup></div>
      <div class="charge-state">${t("chargingEtaMin",eta,v.limit)}</div></div>
      ${batteryBar(SES.soc,v.limit,true)}
      <div class="lim-row"><span>${t("chargeLimitLbl")}</span><b style="color:var(--ink)">${v.limit}%</b></div>
      <input type="range" id="lim" min="50" max="100" step="5" value="${v.limit}" aria-label="${t("chargeLimitLbl")}">
      <div class="grid4">
        <div><b class="num">${SES.kw.toFixed(0)} kW</b><span>${t("powerLbl")}</span></div>
        <div><b class="num">+${SES.kwh.toFixed(1)} kWh</b><span>${t("energyAddedLbl")}</span></div>
        <div><b class="num">${ghs(cost)}</b><span>${t("costSoFarLbl")}</span></div>
        <div><b class="num">+${Math.round(SES.kwh*6.5)} km</b><span>${t("rangeAddedLbl")}</span></div>
      </div>
      <div class="group"><div class="row"><span class="muted">${t("chargerLbl")}</span><b>${c.type} · ${c.kw} kW</b></div><div class="row"><span class="muted">${t("networkLbl")}</span><b>${OPS[s.op].name}</b></div></div>
      <button class="btn stop block" id="stop">${t("stopChargingBtn")}</button>
      <p class="note">${t("demoSpeedNote")}</p></div>`;
    $("#lim").oninput=e=>{v.limit=+e.target.value;save();};
    $("#lim").onchange=()=>renderCharge();
    $("#stop").onclick=()=>stopSession(t("stoppedByYou"));
    return;
  }
  if(receipt){const r=receipt;
    el.innerHTML=`<div class="screen">${BRAND()}<div class="car-stage"><div class="car-name">${esc(r.reason)}</div>
      <div class="soc-big num">${r.soc}<sup>%</sup></div><div class="charge-state" style="color:var(--muted)">${t("socRangeIn",r.from,r.soc,r.mins)}</div></div>
      ${batteryBar(r.soc,v.limit,false)}
      <div class="sec-title">${t("receiptIdTitle",r.id)}</div>
      <div class="group">
        <div class="row"><span class="muted">${t("locationLbl")}</span><b>${esc(r.station)}</b></div>
        <div class="row"><span class="muted">${t("networkLbl")}</span><b>${r.op}</b></div>
        <div class="row"><span class="muted">${t("chargerLbl")}</span><b>${r.plug}</b></div>
        <div class="row"><span class="muted">${t("energyLbl")}</span><b class="num">${r.kwh.toFixed(2)} kWh</b></div>
        <div class="row"><span class="muted">${t("paidFromWalletLbl")}</span><b class="num">${ghs(r.cost)}</b></div>
      </div>
      <button class="btn block" id="done">${t("done")}</button></div>`;
    $("#done").onclick=()=>{receipt=null;renderCharge();};return;
  }
  const hist=S.history.some(h=>(h.cc||"gh")===CC)?`<div class="sec-title">${t("recentTitle")}</div><div class="group">${S.history.filter(h=>(h.cc||"gh")===CC).slice(0,5).map(h=>`<div class="row"><span>${esc(h.station)}<div class="st-sub">${h.op} · ${new Date(h.d).toLocaleDateString(C().locale,{day:"numeric",month:"short"})} · ${h.kind==="swap"?t("batterySwapRangeFrom",h.from):h.kwh.toFixed(1)+" kWh"}</div></span><b class="num">${money(h.cost,h.cc||"gh")}</b></div>`).join("")}</div>`:"";
  if(isSwapV(v)){
    el.innerHTML=`<div class="screen">${BRAND()}<div class="car-stage">
      <div class="car-name">${esc(v.name)} · ${vcl(v.vclass)}</div>
      <div class="soc-big num">${v.soc}<sup>%</sup></div>
      <div class="charge-state" style="color:${v.soc<25?"var(--off)":"var(--muted)"}">${t("rangeLeft",vRange(v))}${v.soc<25?t("swapSoonSuffix"):""}</div></div>
      ${batteryBar(v.soc,100,false)}
      <div style="display:flex;gap:10px;margin-top:20px"><button class="btn block" id="find">${t("findSwapStation")}</button><button class="btn soft block" id="scan">${t("scanStation")}</button></div>
      ${hist||`<p class="note">${t("rideInNote")}</p>`}</div>`;
    $("#find").onclick=()=>{setKind("swap");go("explore");};$("#scan").onclick=openScanner;return;
  }
  el.innerHTML=`<div class="screen">${BRAND()}<div class="car-stage">
      <div class="car-name">${esc(v.name)} · ${t("parkedSuffix")}</div>
      <div class="soc-big num">${v.soc}<sup>%</sup></div>
      <div class="charge-state" style="color:var(--muted)">${t("aboutKmRange",Math.round(v.soc/100*v.battery*6.5))}</div></div>
      ${batteryBar(v.soc,v.limit,false)}
      <div class="lim-row"><span>${t("chargeLimitLbl")}</span><b style="color:var(--ink)" id="limv">${v.limit}%</b></div>
      <input type="range" id="lim" min="50" max="100" step="5" value="${v.limit}" aria-label="${t("chargeLimitLbl")}">
      <div style="display:flex;gap:10px;margin-top:20px"><button class="btn block" id="scan">${t("scanCharger")}</button><button class="btn soft block" id="find">${t("findCharger")}</button></div>
      ${hist||`<p class="note">${t("plugInNote",C().name)}</p>`}</div>`;
  $("#lim").oninput=e=>{v.limit=+e.target.value;$("#limv").textContent=v.limit+"%";el.querySelector(".limit").style.left=`calc(${v.limit}% - 1.5px)`;save();};
  $("#scan").onclick=openScanner;$("#find").onclick=()=>{setKind("charge");go("explore");};
}
function openScanner(){
  openPage(`<div class="topbar">${backBtn()}<span></span></div>
    <h1 class="hero-name">${t("scanChargerTitle")}</h1><p class="muted">${t("scanIntro")}</p>
    <div class="scanner" aria-hidden="true"></div>
    <label class="field"><span>${t("enterIdLabel")}</span><input id="cid" placeholder="GH-AP-001-1" autocomplete="off"></label>
    <div class="err" id="scanErr"></div>`,
    `<button class="btn soft block" id="demoScan">${t("simulateScan")}</button><button class="btn block" id="useId">${t("continueBtn")}</button>`);
  const find=id=>{for(const s of STATIONS){const c=s.conns.find(c=>c.id.toLowerCase()===id.toLowerCase());if(c)return[s,c];}return null;};
  $("#useId").onclick=()=>{const raw=$("#cid").value.trim(),st=STATIONS.find(s=>s.kind==="swap"&&s.id.toLowerCase()===raw.toLowerCase());
    if(st)return openSwapStation(st.id);
    const r=find(raw);
    if(!r){$("#scanErr").textContent=t("chargerNotFound");return;}
    if(r[1].status!=="available"){$("#scanErr").textContent=t("chargerStatusMsg",r[1].id,r[1].status==="busy"?t("inUseLower"):t("offlineLower"),r[0].name);return;}
    openStation(r[0].id,r[1].id);};
  $("#demoScan").onclick=()=>{const v=veh(),pool=[];
    if(isSwapV(v)){const sw=STATIONS.filter(s=>s.kind==="swap"&&s.veh.includes(v.vclass)&&avail(s)).sort((a,b)=>km(ME,a)-km(ME,b))[0];
      if(!sw)return toast(t("noSwapNearby"));$("#cid").value=sw.id;setTimeout(()=>openSwapStation(sw.id),400);return;}STATIONS.forEach(s=>s.conns.forEach(c=>{if(c.status==="available"&&v.plugs.includes(c.type))pool.push([s,c]);}));
    const p=pool[Math.floor(Math.random()*pool.length)];$("#cid").value=p[1].id;setTimeout(()=>openStation(p[0].id,p[1].id),400);};
}

/* ---------- wallet ---------- */
const nw=k=>{const n=Object.values(OPS).filter(o=>o.cc===CC&&o.kind===k).length;return k==="charge"?t("networkCountCharge",n):t("networkCountSwap",n);};
function renderWallet(){
  $("#v-wallet").innerHTML=`<div class="screen"><div class="brandhead">${LOGO}<div><div class="wm">OnePlug</div><div class="tag">${t("appTagline")}</div></div></div><h1 class="screen-title">${t("walletTitle")}</h1>
    <div class="muted">${t("walletCurrency",esc(C().name),C().cur)}</div><div class="balance num">${ghs(S.bal[CC])}</div>
    <p class="muted" style="margin:8px 0 18px">${t("acceptedAt",nw("charge"),nw("swap"),STATIONS.filter(s=>s.cc===CC).length,esc(C().name))}</p>
    <button class="btn block" id="top">${t("addFundsBtn")}</button>
    <div class="sec-title">${t("historyTitle")}</div>
    <div class="group">${S.tx.filter(tx=>(tx.cc||"gh")===CC).slice(0,15).map(tx=>`<div class="row"><span>${esc(tx.t)}<div class="st-sub">${tx.sub?esc(tx.sub)+" · ":""}${new Date(tx.d).toLocaleString(C().locale,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div></span><b class="num" style="${tx.a>0?"color:var(--charge)":""}">${tx.a>0?"+":"−"}${ghs(Math.abs(tx.a))}</b></div>`).join("")}</div></div>`;
  $("#top").onclick=openTopup;
}
function openTopup(){
  let amt=C().top[2],method=C().pay.includes(S.momo)?S.momo:C().pay[0];
  const methods=C().pay,bankCard=t("bankCard");
  const draw=()=>{openPage(`<div class="topbar">${backBtn()}<span></span></div>
    <h1 class="hero-name">${t("addFundsBtn")}</h1>
    <div class="soc-big num" style="font-size:64px;margin:16px 0">${ghs(amt)}</div>
    <div class="pay-grid">${C().top.map(a=>`<button class="opt" data-a="${a}" aria-pressed="${amt===a}">${a.toLocaleString(C().locale)}</button>`).join("")}</div>
    <div class="sec-title">${t("payWithTitle")}</div>
    <div class="group">${[...methods,bankCard].map(m=>`<button class="conn" data-p="${m}" aria-pressed="${method===m}"><span class="radio"></span><span class="grow"><b>${m}</b></span></button>`).join("")}</div>
    <label class="field"><span>${method===bankCard?t("cardNumberLbl"):t("mobileMoneyLbl")}</span><input id="num" inputmode="numeric" placeholder="${method===bankCard?"4242 4242 4242 4242":C().phone}" value="${esc($("#num")?.value||"")}"></label>
    <p class="note">${method===bankCard?t("cardChargedNote"):t("momoPromptNote")} ${t("demoOnlyNote")}</p>`,
    `<button class="btn block" id="pay">${t("addAmountBtn",ghs(amt))}</button>`);
    $("#pageBody").querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{amt=+b.dataset.a;draw();});
    $("#pageBody").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{method=b.dataset.p;draw();});
    $("#pay").onclick=()=>{const n=$("#num").value.replace(/\D/g,"");
      if(n.length<9){$("#num").focus();toast(method===bankCard?t("enterCardNumber"):t("enterMomoNumber"));return;}
      $("#pay").disabled=true;$("#pay").textContent=method===bankCard?t("processingBtn"):t("approveOnPhoneBtn");
      setTimeout(()=>{S.bal[CC]+=amt;S.momo=method;S.tx.unshift({cc:CC,t:t("fundsAddedWord"),sub:method,a:amt,d:Date.now()});save();closePage();go("wallet");toast(t("addedToast",ghs(amt)));},1400);};
  };draw();
}

/* ---------- account ---------- */
const THEME_LBL={auto:"autoLbl",light:"lightLbl",dark:"darkLbl"};
function renderAccount(){
  const H=S.history.filter(h=>(h.cc||"gh")===CC),tot=H.reduce((a,h)=>a+(h.kwh||0),0),nsw=H.filter(h=>h.kind==="swap").length,th=document.documentElement.dataset.theme||"auto";
  $("#v-account").innerHTML=`<div class="screen"><div class="brandhead">${LOGO}<div><div class="wm">OnePlug</div><div class="tag">${t("appTagline")}</div></div></div><h1 class="screen-title">${t("accountTitle")}</h1>
    <div class="card-rfid"><span class="mark card-mark">${LOGO_W}</span><div class="chip-ic"></div><div class="cnum num">4821 0093 1745</div><div class="st-sub">${t("rfidSub")}</div>${stripe()}</div>
    <div class="sec-title">${t("countryTitle")}</div>
    <div class="group"><button class="conn" id="ctryBtn">${stripe()}<span class="grow"><b>${esc(C().name)}</b><div class="st-sub">${esc(C().city)} · ${C().cur} · ${esc(C().pay.join(", "))} · ${esc(C().lang)}</div></span><span class="st-sub" style="color:var(--accent-text);font-weight:700">${t("changeLbl")}</span></button></div>
    <div class="sec-title">${t("vehiclesTitle")}</div>
    <div class="group">${S.vehicles.map((v,i)=>`<button class="conn" data-v="${i}" aria-pressed="${i===S.vIdx}"><span class="radio"></span><span class="grow"><b>${esc(v.name)}</b><div class="st-sub">${isSwapV(v)?t("swapVehicleSub",vcl(v.vclass),v.range||90):t("chargeVehicleSub",v.battery,v.plugs.join(", "))}</div></span><span class="st-sub">${v.soc}%</span></button>`).join("")}
      <button class="conn" id="addV"><span class="grow" style="color:var(--accent-text);font-weight:600">${t("addVehicleBtn")}</span></button></div>
    <div class="sec-title">${t("chargingStatsTitle")}</div>
    <div class="grid4" style="margin-top:0"><div><b class="num">${H.length-nsw}</b><span>${t("chargingSessionsLbl")}</span></div><div><b class="num">${nsw}</b><span>${t("batterySwapsLbl")}</span></div>
      <div><b class="num">${tot.toFixed(0)} kWh</b><span>${t("energyChargedLbl")}</span></div><div><b class="num">${money(H.reduce((a,h)=>a+h.cost,0))}</b><span>${t("spentLbl")}</span></div></div>
    <div class="sec-title">${t("chargingNetworksTitle")}</div>
    <div class="group">${Object.values(OPS).filter(o=>o.cc===CC&&o.kind==="charge").map(o=>`<div class="row"><b>${o.name}</b><span class="st-sub" style="color:var(--charge)">${t("ocpiConnected")}</span></div>`).join("")}</div>
    <div class="sec-title">${t("swapNetworksTitle")}</div>
    <div class="group">${Object.values(OPS).filter(o=>o.cc===CC&&o.kind==="swap").map(o=>`<div class="row"><b>${o.name}</b><span class="st-sub" style="color:var(--swap)">${t("partnerConnected")}</span></div>`).join("")}</div>
    <p class="note">${t("networksNote")}</p>
    <div class="group"><div class="row"><span>${t("appearanceLbl")}</span><div class="toggle">${["auto","light","dark"].map(th2=>`<button data-th="${th2}" aria-pressed="${th===th2}">${t(THEME_LBL[th2])}</button>`).join("")}</div></div>
      <div class="row"><span>${t("languageLbl")}</span><div class="toggle">${["en","fr"].map(l=>`<button data-lang="${l}" aria-pressed="${LANG===l}">${l==="en"?t("englishLbl"):t("frenchLbl")}</button>`).join("")}</div></div>
      <div class="row"><span>${t("demoDataLbl")}</span><button class="btn soft" id="reset" style="padding:8px 12px">${t("resetBtn")}</button></div></div>
    <div class="sec-title">${t("earlierVersionsTitle")}</div>
    <div class="group">${PREV.map(([ti,d,u])=>`<a class="row verlink" href="${u}" target="_blank" rel="noopener"><span class="grow"><b>${esc(ti)}</b><div class="st-sub">${esc(d)}</div></span><span class="arr" aria-hidden="true">↗</span></a>`).join("")}</div>
    <p class="note">${t("oneAccountNote")}</p>
    <p class="note">${t("prototypeNote")}</p></div>`;
  $("#v-account").querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{if(SES)return toast(t("stopChargingFirst"));S.vIdx=+b.dataset.v;save();renderAccount();renderExplore();});
  $("#v-account").querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{const th2=b.dataset.th;if(th2==="auto")delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=th2;try{localStorage.setItem(KEY+"-theme",th2);}catch(e){}renderAccount();if(gmap)initMap();});
  $("#v-account").querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  $("#ctryBtn").onclick=openCountry;
  $("#addV").onclick=addVehicle;
  $("#reset").onclick=()=>{if(SES)return toast(t("stopChargingFirst"));S=JSON.parse(JSON.stringify(defaults));receipt=null;save();renderAll();go("account");toast(t("demoReset"));};
}
function addVehicle(){
  const plugs=new Set(["CCS2"]);let vc="Car";
  const draw=()=>{const n=$("#vn")?.value||"",b=$("#vb")?.value||"64",rg=$("#vr")?.value||"90",car=vc==="Car";
    openPage(`<div class="topbar">${backBtn()}<span></span></div><h1 class="hero-name">${t("addVehicleBtn")}</h1>
    <div class="sec-title">${t("typeTitle")}</div>
    <div class="seg3">${["Car","Motorbike","Tricycle"].map(vt=>`<button class="opt" data-vt="${vt}" aria-pressed="${vc===vt}">${vt==="Car"?t("carWord"):vcl(vt)}</button>`).join("")}</div>
    <label class="field"><span>${t("nameLbl")}</span><input id="vn" placeholder="${car?t("namePlaceholderCar"):vc==="Motorbike"?t("namePlaceholderMoto"):t("namePlaceholderTrike")}" value="${esc(n)}"></label>
    ${car?`<label class="field"><span>${t("batterySizeLbl")}</span><input id="vb" type="number" min="10" max="200" value="${esc(b)}"></label>
    <div class="sec-title">${t("plugsAcceptedTitle")}</div>
    <div class="group">${PLUGS.map(p=>`<button class="conn" data-pl="${p}" aria-pressed="${plugs.has(p)}"><span class="radio" style="border-radius:6px"></span><span class="grow"><b>${p}</b></span></button>`).join("")}</div>`
    :`<label class="field"><span>${t("rangeLbl")}</span><input id="vr" type="number" min="20" max="300" value="${esc(rg)}"></label>
    <p class="note">${t("swapVehicleNote",vcl(vc))}</p>`}`,
    `<button class="btn block" id="saveV">${t("addVehicleBtn")}</button>`);
    $("#pageBody").querySelectorAll("[data-vt]").forEach(x=>x.onclick=()=>{vc=x.dataset.vt;draw();});
    $("#pageBody").querySelectorAll("[data-pl]").forEach(x=>x.onclick=()=>{const p=x.dataset.pl;plugs.has(p)?plugs.delete(p):plugs.add(p);draw();});
    $("#saveV").onclick=()=>{const n=$("#vn").value.trim();
      if(!n){toast(t("nameVehiclePrompt"));$("#vn").focus();return;}
      if(vc!=="Car"){S.vehicles.push({name:n,vclass:vc,range:+$("#vr").value||90,soc:30,limit:100,plugs:[]});}
      else{const b=+$("#vb").value;if(!plugs.size){toast(t("pickPlugPrompt"));return;}
      S.vehicles.push({name:n,vclass:"Car",battery:b||60,soc:30,limit:80,plugs:[...plugs]});}S.vIdx=S.vehicles.length-1;save();closePage();renderAccount();renderExplore();toast(t("vehicleAdded"));};
  };draw();
}

/* ---------- nav ---------- */
function go(tab){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="v-"+tab));
  document.querySelectorAll("nav.tabs button").forEach(b=>{if(b.dataset.tab===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  if(tab==="explore")requestAnimationFrame(()=>renderExplore());if(tab==="charge")renderCharge();if(tab==="wallet")renderWallet();if(tab==="account")renderAccount();
  window.scrollTo(0,0);
}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));
setInterval(()=>{const s=STATIONS[Math.floor(Math.random()*STATIONS.length)],c=s.conns[Math.floor(Math.random()*s.conns.length)];
  if(SES&&c===SES.c)return;if(c.status==="available"||c.status==="busy")c.status=c.status==="available"?"busy":"available";
  if($("#v-explore").classList.contains("active")&&!$("#page").classList.contains("open"))renderExplore();},7000);
function renderAll(){renderFilters();renderExplore();renderCharge();}
/* ---------- static-markup i18n: the handful of strings that live in index.html rather than a render() ---------- */
function applyStaticI18n(){
  document.documentElement.lang=LANG;
  $("#splash").setAttribute("aria-label",t("splashAria"));
  const splashTag=$("#splashTag");if(splashTag)splashTag.textContent=t("appTagline");
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n);});
  document.querySelectorAll("[data-i18n-aria]").forEach(el=>{el.setAttribute("aria-label",t(el.dataset.i18nAria));});
  $("#zin").setAttribute("aria-label",t("zoomInAria"));
  $("#zout").setAttribute("aria-label",t("zoomOutAria"));
  $("#meBtn").setAttribute("aria-label",t("myLocationAria"));
  $("#map").setAttribute("aria-label",t("mapAria"));
  $("#q").setAttribute("aria-label",t("searchStationsAria"));
  const other=LANG==="en"?"fr":"en";
  $("#langPill").textContent=other.toUpperCase();
  $("#langPill").setAttribute("aria-label",t("switchLanguageAria",other==="en"?t("englishLbl"):t("frenchLbl")));
}
$("#langPill").onclick=()=>setLang(LANG==="en"?"fr":"en");
/* single entry point for every language switch: the Account toggle and the header pill both call this */
function setLang(l){LANG=l;try{localStorage.setItem("oneplug-africa-v1-lang",LANG);}catch(e){}
  applyStaticI18n();renderMarket();renderAccount();renderAll();refreshMapNoticeIfShown();}
loadGoogleMaps();
try{const sv=localStorage.getItem(KEY+"-theme");if(sv&&sv!=="auto")document.documentElement.dataset.theme=sv;}catch(e){}
applyStaticI18n();renderMarket();renderAll();
(()=>{const sp=$("#splash"),hide=()=>sp.classList.add("gone");sp.onclick=hide;setTimeout(hide,1600);})();
