/* app.js - Coeur du jeu : Etat, Combat, Vagues, UI Principale */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const CONFIG = {
        plantsPerWave: 10,
        wavesPerRoute: 10,
        playerDamage: 10,
        clickRadius: 50,      // Rayon en px
        sapPerKill: 10        // Quantite de seve gagnee par plante tuee
    };

    // --- ETAT DU JEU (Exporte vers window) ---
    // Valeurs par defaut
    const defaultGameState = {
        currentRoute: 1,
        wavesCompleted: 0,
        wavesCompletedParRoute: {},   // <-- NOUVEAU : garde le score de chaque route individuellement
        unlockedRoute: 1,
        plusHauteRouteAtteinte: 1, // NOUVEAU : record de progression qui ne se reinitialise JAMAIS (meme apres une Mutation Genetique) - utilise par Capsules.js pour empecher de trivialiser le cout des capsules en revenant farmer une route facile
        inventory: {},
        inventairePlantes: {},
        inventaireSeves: {},
        activePlants: [], // Sera toujours vide au chargement
        isAdminUnlocked: false, // Reset a chaque rechargement pour la securite
        golds: 0,
        gemmes: 0,
        xp: 0,
        niveau: 1,
        niveauMaxDebloque: 10, // NOUVEAU : plafond de niveau, releve en vainquant le Boss
        mutationUpgrades: {},
        brinsMutants: 0, // Monnaie de mutation (Boutique + module Mutation Genetique)
        eclatsEmeraude: 0, // NOUVEAU : monnaie pour l'Arbre d'Évolution
        evolutionTalents: [], // NOUVEAU : talents achetes dans l'Arbre d'Evolution
        totalMutations: 0,
        boss: { niveau: 1, derniereTentative: 0 }, // NOUVEAU : progression du combat de Boss
        capsulesGaugeCurrent: 0, // NOUVEAU : Capsules Organiques Scellees
        capsulesObtenues: 0,
        capsulesStock: 0,
        objetsInventaire: {},
        buffsActifs: {},
        symbioteAmeliorationChoisie: null, // NOUVEAU : amelioration unique de Symbiotes (500 gemmes)
        boutique: null   // Initialise par boutiqueManager.ensureDefaults()
    };

    // Initialisation de l'etat global
    window.gameState = JSON.parse(JSON.stringify(defaultGameState));
    window.gameState.inventaireSeves = window.gameState.inventory;
    window.gameState.inventory = window.gameState.inventaireSeves;

    // --- SELECTION DES ELEMENTS DOM ---
    const resourcesList = document.getElementById('resources-list');
    const routeTitle = document.getElementById('route-title');
    const waveProgress = document.getElementById('wave-progress');
    const btnRouteNext = document.getElementById('btn-route-next');
    const btnRoutePrev = document.getElementById('btn-route-prev');
    const btnAutoRoute = document.getElementById('btn-auto-route');
    const serreTab = document.getElementById('tab-serre');

    // Etat du mode "Auto" (montee automatique de route). Reinitialise a chaque rechargement.
    let autoRouteActif = false;

    // --- FONCTIONS DE PERSISTANCE ---

    /**
     * Sauvegarde l'etat du jeu dans localStorage
     */
    window.sauvegarderProgression = function() {
        try {
            const sapInventory = window.gameState.inventaireSeves || window.gameState.inventory || {};
            const plantInventory = window.gameState.inventairePlantes || {};

            // On ne sauvegarde pas activePlants car ils sont regeneres
            const dataToSave = {
                currentRoute: window.gameState.currentRoute,
                wavesCompleted: window.gameState.wavesCompleted,
                wavesCompletedParRoute: window.gameState.wavesCompletedParRoute || {}, // <-- NOUVEAU
                unlockedRoute: window.gameState.unlockedRoute,
                plusHauteRouteAtteinte: window.gameState.plusHauteRouteAtteinte || window.gameState.unlockedRoute || 1, // NOUVEAU
                inventory: sapInventory,
                inventairePlantes: plantInventory,
                inventaireSeves: sapInventory,
                golds: window.gameState.golds || 0,
                gemmes: window.gameState.gemmes || 0,
                symbiotesAchetees: window.gameState.symbiotesAchetees || [],
                upgrades: window.gameState.upgrades || {},
                xp: window.gameState.xp || 0,
                niveau: window.gameState.niveau || 1,
                niveauMaxDebloque: window.gameState.niveauMaxDebloque || 10, // NOUVEAU
                mutationUpgrades: window.gameState.mutationUpgrades || {},
                brinsMutants: window.gameState.brinsMutants || 0,
                eclatsEmeraude: window.gameState.eclatsEmeraude || 0, // NOUVEAU
                evolutionTalents: window.gameState.evolutionTalents || [], // NOUVEAU
                totalMutations: window.gameState.totalMutations || 0,
                boss: window.gameState.boss || { niveau: 1, derniereTentative: 0 }, // NOUVEAU
                capsulesGaugeCurrent: window.gameState.capsulesGaugeCurrent || 0, // NOUVEAU
                capsulesObtenues: window.gameState.capsulesObtenues || 0,
                capsulesStock: window.gameState.capsulesStock || 0,
                objetsInventaire: window.gameState.objetsInventaire || {},
                buffsActifs: window.gameState.buffsActifs || {},
                symbioteAmeliorationChoisie: window.gameState.symbioteAmeliorationChoisie || null,
                boutique: window.gameState.boutique || null
            };
            localStorage.setItem('laSerreEmeraude_save', JSON.stringify(dataToSave));

            // NOUVEAU : Progression Hors-Ligne - on note l'heure a chaque sauvegarde
            if (window.offlineManager) {
                window.offlineManager.enregistrerTimestamp();
            }
        } catch (e) {
            console.error("Erreur lors de la sauvegarde:", e);
        }
    };

    /**
     * Charge l'etat du jeu depuis localStorage
     */
    window.chargerProgression = function() {
        try {
            const savedData = localStorage.getItem('laSerreEmeraude_save');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const restoredSaps = parsedData.inventaireSeves || parsedData.inventory || {};

                // Fusionner avec les valeurs par defaut pour eviter les erreurs si la structure change
                window.gameState = {
                    ...defaultGameState,
                    ...parsedData,
                    inventairePlantes: parsedData.inventairePlantes || {},
                    inventaireSeves: restoredSaps,
                    inventory: restoredSaps,
                    golds: parsedData.golds || 0,
                    gemmes: parsedData.gemmes || 0,
                    symbiotesAchetees: parsedData.symbiotesAchetees || [],
                    upgrades: parsedData.upgrades || {},
                    xp: parsedData.xp || 0,
                    niveau: parsedData.niveau || 1,
                    niveauMaxDebloque: parsedData.niveauMaxDebloque || 10, // NOUVEAU
                    plusHauteRouteAtteinte: parsedData.plusHauteRouteAtteinte || parsedData.unlockedRoute || 1, // NOUVEAU
                    mutationUpgrades: parsedData.mutationUpgrades || {},
                    brinsMutants: parsedData.brinsMutants || 0,
                    eclatsEmeraude: parsedData.eclatsEmeraude || 0, // NOUVEAU
                    evolutionTalents: parsedData.evolutionTalents || [], // NOUVEAU
                    totalMutations: parsedData.totalMutations || 0,
                    boss: parsedData.boss || { niveau: 1, derniereTentative: 0 }, // NOUVEAU
                    capsulesGaugeCurrent: parsedData.capsulesGaugeCurrent || 0, // NOUVEAU
                    capsulesObtenues: parsedData.capsulesObtenues || 0,
                    capsulesStock: parsedData.capsulesStock || 0,
                    objetsInventaire: parsedData.objetsInventaire || {},
                    buffsActifs: parsedData.buffsActifs || {},
                    symbioteAmeliorationChoisie: (typeof parsedData.symbioteAmeliorationChoisie !== 'undefined') ? parsedData.symbioteAmeliorationChoisie : null,
                    boutique: parsedData.boutique || null,
                    wavesCompletedParRoute: parsedData.wavesCompletedParRoute || {} // <-- NOUVEAU
                };

                // Compatibilite : si une ancienne sauvegarde n'a pas encore d'entree
                // pour la route actuelle, on l'initialise avec la valeur de wavesCompleted existante
                if (typeof window.gameState.wavesCompletedParRoute[window.gameState.currentRoute] !== 'number') {
                    window.gameState.wavesCompletedParRoute[window.gameState.currentRoute] = window.gameState.wavesCompleted || 0;
                }

                if (parsedData.symbiotesAchetees) {
                    window.symbiotesManager.achetes = parsedData.symbiotesAchetees;
                }

                // Reappliquer les effets des upgrades achetes (secateur ET symbiotes)
                // car window.secateur et window.symbiotesManager repartent de zero a chaque chargement de script
                if (window.upgradesManager && window.upgradesManager.reappliquerAmeliorations) {
                    window.upgradesManager.reappliquerAmeliorations();
                }

                // Reapplique les bonus de la boutique (degats secateur, slot symbiote, stock pack gratuit)
                if (window.boutiqueManager && window.boutiqueManager.reappliquer) {
                    window.boutiqueManager.reappliquer();
                }

                console.log("Progression chargee avec succes.");
            } else {
                console.log("Aucune sauvegarde trouvee. Nouvelle partie.");
            }
        } catch (e) {
            console.error("Erreur lors du chargement:", e);
            // En cas d'erreur, on garde les valeurs par defaut
        }
    };

    // --- FONCTIONS PRINCIPALES ---

    // Variable pour stocker le frame ID
    let gameLoopId = null;

    /**
     * Boucle principale du jeu (Game Loop)
     * Executee a chaque frame (environ 60 fois par seconde)
     */
    function gameLoop() {
        // Mise a jour des symbiotes
        if (window.symbiotesManager && window.symbiotesManager.update) {
            window.symbiotesManager.update();
        }

        // Vous pouvez ajouter d'autres mises a jour visuelles ici
        // ex: animations de particules, effets de particule de clic, etc.

        // On demande la prochaine frame
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    /**
     * Initialise l'interface
     */
    function initGame() {
        // 0. Progression Hors-Ligne : CAPTURER le temps d'absence EN TOUT PREMIER,
        // avant chargerProgression() et avant toute routine d'initialisation.
        // CRITIQUE : la reactivation des symbiotes (etape 2quater plus bas) declenche
        // elle-meme une sauvegarde (sauvegarderEtat() -> sauvegarderProgression()), qui
        // ecraserait le timestamp d'absence AVANT qu'on ait pu calculer les gains, si on
        // ne le figeait pas maintenant.
        if (window.offlineManager) {
            window.offlineManager.capturerAbsence();
        }

        // 1. Charger la progression avant tout
        chargerProgression();

        // 1bis. Appliquer les bonus permanents de Mutation Genetique
        if (window.mutationManager && window.mutationManager.reappliquerBonusPermanents) {
            window.mutationManager.reappliquerBonusPermanents();
        }

        // 2. Charger les symbiotes achetes depuis la sauvegarde
        if (window.chargerSymbiotesSauvegardes) {
            window.chargerSymbiotesSauvegardes();
        }

        // 2bis. S'assurer que la boutique est initialisee meme sans sauvegarde existante
        // (doit tourner AVANT la reactivation des symbiotes car elle definit maxActifs)
        if (window.boutiqueManager && window.boutiqueManager.reappliquer) {
            window.boutiqueManager.reappliquer();
        }

        // 2ter. Reappliquer les effets permanents de l'Arbre d'Evolution
        // (doit tourner AVANT la reactivation des symbiotes car elle peut aussi augmenter maxActifs)
        if (window.evolutionManager && window.evolutionManager.reappliquerEffetsDirects) {
            window.evolutionManager.reappliquerEffetsDirects();
        }

        // 2quater. Reactiver visuellement les symbiotes qui etaient actifs avant le rechargement.
        // IMPORTANT : doit etre fait EN DERNIER, une fois que maxActifs a sa valeur finale
        // (boutique + evolution), sinon un symbiote au-dela de l'ancienne limite de base (2)
        // serait silencieusement rejete par activer() tout en restant marque "actif" en donnees.
        if (window.reactiverSymbiotesSauvegardes) {
            window.reactiverSymbiotesSauvegardes();
        }

        // 2quinquies. Progression Hors-Ligne : calcule et applique les gains d'absence.
        // Doit venir APRES la reactivation des symbiotes (on a besoin de leurs stats reelles en direct).
        if (window.offlineManager) {
            window.offlineManager.calculerEtAppliquerProgression();
        }

        // 2sexies. Initialiser l'UI des Capsules Organiques Scellees
        if (window.capsulesManager) {
            window.capsulesManager.init();
        }

        // 3. Verifier les donnees externes
        if (!window.PLANT_DB) {
            console.error("Erreur : donnees.js non charge.");
            return;
        }

        // 4. Mettre a jour l'UI et lancer la vague
        window.updateRouteUI();
        window.updateHeaderUI();
        if (window.updateXpBarUI) window.updateXpBarUI();
        window.spawnWave();
        
        // 5. Configurer les ecouteurs
        setupEventListeners();
        updateAutoRouteUI();

        // 6. Lancement de la boucle de jeu
        if (!gameLoopId) {
            gameLoop();
        }

        // 7. Rafraichir le menu si ouvert
        if (window.refreshSymbiotesMenu) {
            window.refreshSymbiotesMenu();
        }

        // 8. Progression Hors-Ligne : capture aussi les fermetures d'onglet/app.
        // pagehide couvre la fermeture (mobile/tablette/desktop), visibilitychange couvre
        // le passage en arriere-plan (ex: on quitte l'app sans la fermer completement).
        window.addEventListener('pagehide', () => {
            if (window.offlineManager) window.offlineManager.enregistrerTimestamp();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && window.offlineManager) {
                window.offlineManager.enregistrerTimestamp();
            }
        });
    }

    let attackIntervalId = null;
    let lastAttackTime = 0;
    let lastEvent = null; // Pour suivre la position actuelle lors du deplacement

    /**
     * Configure les ecouteurs
     */
    function setupEventListeners() {
        if (serreTab) {
            const startAttack = (e) => {
                // Si on clique sur un bouton overlay ou un bouton de l'arene de boss, on ne declenche pas l'attaque
                if (e.target.closest('.overlay-btn') || e.target.closest('.btn-boss-quit') || e.target.closest('button')) return;

                if (e.type === 'touchstart') e.preventDefault();

                lastEvent = e; // On enregistre l'evenement initial
                handleGlobalClick(e);
                lastAttackTime = Date.now();

                if (attackIntervalId) clearInterval(attackIntervalId);

                attackIntervalId = setInterval(() => {
                    const secateurStats = window.sécateur || window.secateur;
                    const speed = secateurStats?.attackSpeed || 500;
                    
                    if (Date.now() - lastAttackTime >= speed && lastEvent) {
                        handleGlobalClick(lastEvent);
                        lastAttackTime = Date.now();
                    }
                }, 50);
            };

            const moveAttack = (e) => {
                if (attackIntervalId) {
                    lastEvent = e; // Met a jour la position de l'attaque en cours
                }
            };

            const stopAttack = () => {
                if (attackIntervalId) {
                    clearInterval(attackIntervalId);
                    attackIntervalId = null;
                    lastEvent = null;
                }
            };

            // Souris
            serreTab.addEventListener('mousedown', startAttack);
            window.addEventListener('mousemove', moveAttack);
            window.addEventListener('mouseup', stopAttack);
            
            // Tactile
            serreTab.addEventListener('touchstart', startAttack, { passive: false });
            serreTab.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Empeche le scroll pendant l'attaque
                moveAttack(e);
            }, { passive: false });
            window.addEventListener('touchend', stopAttack);
            window.addEventListener('touchcancel', stopAttack);
            
            // On garde le click pour la compatibilite (certains navigateurs)
            // mais on s'assure qu'il ne double pas l'attaque si mousedown est gere
            serreTab.addEventListener('click', (e) => {
                if (Date.now() - lastAttackTime > 100) {
                    handleGlobalClick(e);
                }
            });
        }

        if (btnRouteNext) btnRouteNext.addEventListener('click', () => {
            desactiverAutoRoute();
            window.changeRoute(1);
        });
        if (btnRoutePrev) btnRoutePrev.addEventListener('click', () => {
            desactiverAutoRoute();
            window.changeRoute(-1);
        });
        if (btnAutoRoute) btnAutoRoute.addEventListener('click', toggleAutoRoute);
    }

    /**
     * Active/Desactive le mode Auto (montee automatique de route des qu'une nouvelle
     * route est debloquee) et met a jour l'apparence du bouton pour que la difference
     * soit visible immediatement.
     */
    function toggleAutoRoute() {
        autoRouteActif = !autoRouteActif;
        updateAutoRouteUI();
    }

    function desactiverAutoRoute() {
        if (autoRouteActif) {
            autoRouteActif = false;
            updateAutoRouteUI();
        }
    }

    function updateAutoRouteUI() {
        if (!btnAutoRoute) return;
        btnAutoRoute.classList.toggle('active', autoRouteActif);
        btnAutoRoute.textContent = autoRouteActif ? 'AUTO ✔' : 'AUTO';
        btnAutoRoute.title = autoRouteActif
            ? 'Mode Auto ACTIF : montee automatique des qu\'une route est debloquee'
            : 'Monte automatiquement de route des qu\'elle est debloquee';
    }

    /**
     * Met a jour l'UI Route (Exporte pour Admin)
     */
    window.updateRouteUI = function() {
        const nextCounter = document.getElementById('route-next-counter');
        const vaguesRestantes = Math.max(0, CONFIG.wavesPerRoute - window.gameState.wavesCompleted);

        const db = window.PLANT_DB;
        if (db && db[window.gameState.currentRoute - 1]) {
            const currentTheme = db[window.gameState.currentRoute - 1].theme;
            if (serreTab) {
                serreTab.style.background = currentTheme;
            }
        }

        if (btnRouteNext) {
            if (window.gameState.currentRoute >= window.gameState.unlockedRoute) {
                btnRouteNext.disabled = true;
                if (nextCounter) {
                    nextCounter.style.display = 'flex';
                    nextCounter.textContent = vaguesRestantes;
                }
            } else {
                btnRouteNext.disabled = false;
                if (nextCounter) {
                    nextCounter.style.display = 'none';
                }
            }
        }

        if (btnRoutePrev) {
            btnRoutePrev.disabled = (window.gameState.currentRoute <= 1);
        }
    };

    /**
     * Met a jour l'en-tete contextuellement pour la route actuelle
     */
    window.updateHeaderUI = function() {
        if (!resourcesList || !window.ROUTE_CONFIG || !window.PLANT_DB) return;

        const currentRouteId = window.gameState.currentRoute;
        const routeConfig = window.ROUTE_CONFIG.find(r => r.routeId === currentRouteId);

        if (!routeConfig) return;

        resourcesList.innerHTML = '';

        const moneyContainer = document.createElement('div');
        moneyContainer.className = 'money-container';

        const goldItem = document.createElement('div');
        goldItem.className = 'resource-item money-item';
        goldItem.innerHTML = `<span class="icon">💰</span> <span class="amount">${window.gameState.golds || 0}</span>`;

        const gemItem = document.createElement('div');
        gemItem.className = 'resource-item money-item';
        gemItem.innerHTML = `<span class="icon">💎</span> <span class="amount">${window.gameState.gemmes || 0}</span>`;

        const brinsItem = document.createElement('div');
        brinsItem.className = 'resource-item money-item';
        brinsItem.title = 'Brins Mutants';
        brinsItem.innerHTML = `<span class="icon">🧬</span> <span class="amount">${window.gameState.brinsMutants || 0}</span>`;

        // NOUVEAU : Éclats d'Émeraude
        const eclatsItem = document.createElement('div');
        eclatsItem.className = 'resource-item money-item';
        eclatsItem.title = 'Éclats d\'Émeraude';
        eclatsItem.innerHTML = `<span class="icon">💚</span> <span class="amount">${window.gameState.eclatsEmeraude || 0}</span>`;

        moneyContainer.appendChild(goldItem);
        moneyContainer.appendChild(gemItem);
        moneyContainer.appendChild(brinsItem);
        moneyContainer.appendChild(eclatsItem); // NOUVEAU
        resourcesList.appendChild(moneyContainer);

        const separator = document.createElement('div');
        separator.className = 'header-separator';
        separator.innerHTML = '|';
        resourcesList.appendChild(separator);

        const allowedPlantNames = routeConfig.allowedPlantNames || [];

        allowedPlantNames.forEach(plantName => {
            const plantData = window.PLANT_DB.find(p => p.name === plantName);
            if (!plantData) return;

            const sapName = plantData.sapName;
            const sapIcon = '🧪';
            const plantCount = window.gameState.inventairePlantes?.[plantName] || 0;
            const sapCount = window.gameState.inventaireSeves?.[sapName] || 0;

            if (plantCount > 0 || sapCount > 0) {
                const item = document.createElement('div');
                item.className = 'resource-item';
                item.innerHTML = `
                    <div class="resource-pair">
                        <span class="res-plant">${window.creerImgPlanteHTML(plantName, 'res-plant-img')} <span class="amount">${plantCount}</span></span>
                        <span class="res-separator">|</span>
                        <span class="res-sap">${sapIcon} <span class="amount">${sapCount}</span></span>
                    </div>
                `;
                item.title = `${plantName} → ${sapName}`;
                resourcesList.appendChild(item);
            }
        });

        if (resourcesList.children.length <= 2) {
            const routeInfo = document.createElement('div');
            routeInfo.className = 'resource-item';
            routeInfo.style.opacity = '0.5';
            routeInfo.style.fontSize = '0.8rem';
            routeInfo.innerText = `Route ${currentRouteId}`;
            resourcesList.appendChild(routeInfo);
        }
    };

    /**
     * Met a jour l'inventaire (Exporte pour Admin)
     */
    window.updateInventoryUI = function() {
        if (!resourcesList) return;
        resourcesList.innerHTML = '';

        const sapInventory = window.gameState.inventaireSeves || window.gameState.inventory || {};
        window.gameState.inventaireSeves = sapInventory;
        window.gameState.inventory = sapInventory;
        
        Object.keys(sapInventory).forEach(sapName => {
            const quantity = sapInventory[sapName];
            if (quantity > 0) {
                const item = document.createElement('div');
                item.className = 'resource-item';
                item.innerHTML = `<span class="sap-icon">🧪</span> ${sapName}: <strong>${quantity}</strong>`;
                resourcesList.appendChild(item);
            }
        });

        if (Object.keys(sapInventory).length === 0) {
            resourcesList.innerHTML = '<div class="resource-item" style="opacity:0.5">Aucune seve recoltee</div>';
        }
    };

    /**
     * Genere une vague (Exporte pour Admin)
     */
    window.spawnWave = function() {
        if (serreTab) {
            serreTab.innerHTML = ''; 
        }
        window.gameState.activePlants = [];

        const db = window.PLANT_DB;
        if (!db) return;

        let currentPlantIndex = window.gameState.currentRoute - 1;
        let prevPlantIndex = currentPlantIndex - 1;

        for (let i = 0; i < CONFIG.plantsPerWave; i++) {
            let selectedPlantTemplate;

            if (window.gameState.currentRoute === 1) {
                selectedPlantTemplate = db[0];
            } else {
                const roll = Math.random();
                if (roll < 0.5) {
                    selectedPlantTemplate = db[currentPlantIndex];
                } else {
                    selectedPlantTemplate = db[prevPlantIndex];
                }
            }

            createPlant(selectedPlantTemplate);
        }
    };

    /**
     * Liste des selecteurs CSS des elements "boutons overlay" a eviter lors du spawn
     * des plantes (flechettes de route, menu, stats, parametres, jauge des capsules...).
     * Centralise ici pour etre facile a completer si de nouveaux boutons flottants
     * sont ajoutes plus tard au-dessus de la zone de jeu.
     */
    const SELECTEURS_ZONES_EXCLUES = [
        '#game-controls-overlay',   // Boss + fleches de route + AUTO (colonne droite)
        '.bottom-nav-overlay',      // Menu / Stats / Parametres (bas, centre)
        '#capsule-gauge-container', // Jauge verticale des Capsules (colonne gauche)
        '#capsule-bottom-btn'       // Bouton rond des Capsules (bas)
    ];

    /**
     * Calcule les rectangles (en px, relatifs au conteneur de jeu) a eviter lors du
     * placement d'une plante, avec une marge de securite pour laisser de la place a
     * l'image de la plante ET sa barre de vie (qui depasse de ~15px au-dessus).
     */
    function getZonesExclues(containerRect) {
        const margeSecurite = 25; // px de marge autour de chaque bouton
        const zones = [];

        SELECTEURS_ZONES_EXCLUES.forEach(selecteur => {
            const el = document.querySelector(selecteur);
            if (!el) return;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return; // pas encore rendu / masque

            zones.push({
                left: (r.left - containerRect.left) - margeSecurite,
                top: (r.top - containerRect.top) - margeSecurite,
                right: (r.right - containerRect.left) + margeSecurite,
                bottom: (r.bottom - containerRect.top) + margeSecurite
            });
        });

        return zones;
    }

    function rectanglesSeChevauchent(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    /**
     * Tire une position (en %) pour une nouvelle plante en evitant les zones occupees
     * par les boutons overlay. Retente plusieurs fois avant de se rabattre sur une
     * position de secours (centre-gauche, generalement libre sur tous les formats).
     */
    function tirerPositionPlanteValide(containerRect) {
        const largeurPlante = 64;
        const hauteurPlante = 64;
        const depassementBarreVie = 15; // la barre de vie deborde d'environ 15px au-dessus de l'image
        const margeBordure = 8; // marge minimale par rapport aux bords du conteneur

        const zonesExclues = getZonesExclues(containerRect);

        const largeurUtile = Math.max(20, containerRect.width - largeurPlante - margeBordure * 2);
        const hauteurUtile = Math.max(20, containerRect.height - hauteurPlante - depassementBarreVie - margeBordure * 2);

        const maxTentatives = 40;
        for (let i = 0; i < maxTentatives; i++) {
            const x = margeBordure + Math.random() * largeurUtile;
            const y = margeBordure + depassementBarreVie + Math.random() * hauteurUtile;

            const rectPlante = {
                left: x,
                top: y - depassementBarreVie,
                right: x + largeurPlante,
                bottom: y + hauteurPlante
            };

            const collision = zonesExclues.some(zone => rectanglesSeChevauchent(rectPlante, zone));
            if (!collision) {
                return {
                    xPercent: (x / containerRect.width) * 100,
                    yPercent: (y / containerRect.height) * 100
                };
            }
        }

        // Secours : si aucune position libre n'a ete trouvee apres plusieurs tentatives
        // (ecran tres petit / beaucoup de zones exclues), on retombe sur une zone
        // generalement toujours degagee (centre-gauche de l'ecran).
        return { xPercent: 25, yPercent: 35 };
    }

    /**
     * Cree une plante individuelle avec barre de vie
     */
    function createPlant(template) {
        const plantEl = document.createElement('div');
        plantEl.classList.add('plant-entity');

        const plantImg = document.createElement('img');
        plantImg.className = 'plant-img';
        plantImg.src = window.getPlantImagePath(template.name);
        plantImg.alt = template.name;
        plantImg.onerror = function() { this.style.display = 'none'; };
        plantEl.appendChild(plantImg);

        const healthBarContainer = document.createElement('div');
        healthBarContainer.className = 'health-bar-container';

        const healthBarFill = document.createElement('div');
        healthBarFill.className = 'health-bar-fill';
        healthBarFill.style.width = '100%';
        healthBarContainer.appendChild(healthBarFill);
        plantEl.appendChild(healthBarContainer);

        // Position calculee en evitant activement les zones occupees par les boutons
        // overlay (route, menu, stats, parametres, capsules...) - remplace l'ancien
        // positionnement purement aleatoire qui laissait les plantes spawner derriere
        // les boutons sur les petits ecrans (mobile).
        const containerRect = serreTab ? serreTab.getBoundingClientRect() : { left: 0, top: 0, width: 300, height: 500 };
        const position = tirerPositionPlanteValide(containerRect);

        plantEl.style.left = `${position.xPercent}%`;
        plantEl.style.top = `${position.yPercent}%`;

        const plantData = {
            id: Date.now() + Math.random(),
            element: plantEl,
            template: template,
            pv: template.pv
        };

        if (serreTab) {
            serreTab.appendChild(plantEl);
        }
        window.gameState.activePlants.push(plantData);
    }

    /**

     * Gere le clic global (Systeme AoE avec Secateur)
     */
    function handleGlobalClick(event) {
        // En mode combat de boss, le clic sert uniquement a attaquer le boss
        if (window.bossManager && window.bossManager.enCombat) {
            window.bossManager.gererClic(event);
            return;
        }

        if (!serreTab) return;
        
        const rect = serreTab.getBoundingClientRect();
        
        // Gestion des coordonnees tactiles ou souris
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;

        const secateurStats = window.sécateur || window.secateur;
        createClickEffect(clickX, clickY, secateurStats?.radius || CONFIG.clickRadius);

        const plantsToCheck = [...window.gameState.activePlants];
        const damage = window.calculerDegatsSecateur();

        plantsToCheck.forEach(plant => {
            const plantRect = plant.element.getBoundingClientRect();
            const plantCenterX = (plantRect.left - rect.left) + (plantRect.width / 2);
            const plantCenterY = (plantRect.top - rect.top) + (plantRect.height / 2);

            const distance = Math.sqrt(
                Math.pow(clickX - plantCenterX, 2) + 
                Math.pow(clickY - plantCenterY, 2)
            );

            if (distance <= (secateurStats?.radius || CONFIG.clickRadius)) {
                window.appliquerDegats(plant, damage);
            }
        });
    }

    /**
     * Fonction appelee quand une vague est completee
     */
    window.onWaveCompleted = function() {
        window.gameState.wavesCompleted++;

        // NOUVEAU : on garde en memoire la progression de CETTE route specifiquement
        if (!window.gameState.wavesCompletedParRoute) window.gameState.wavesCompletedParRoute = {};
        window.gameState.wavesCompletedParRoute[window.gameState.currentRoute] = window.gameState.wavesCompleted;

        window.updateRouteUI();
        window.updateHeaderUI();

        let routeVientDetreDebloquee = false;
        if (window.gameState.wavesCompleted >= CONFIG.wavesPerRoute) {
            if (window.gameState.currentRoute === window.gameState.unlockedRoute) {
                window.gameState.unlockedRoute++;
                routeVientDetreDebloquee = true;

                // NOUVEAU : le record de progression ne redescend JAMAIS, meme apres
                // une future Mutation Genetique (voir Capsules.js pour son utilisation)
                if (window.gameState.unlockedRoute > (window.gameState.plusHauteRouteAtteinte || 1)) {
                    window.gameState.plusHauteRouteAtteinte = window.gameState.unlockedRoute;
                }
            }

            // Mode Auto : dès que la route actuelle est cleared (vagues requises atteintes),
            // on monte sur la suivante si elle est accessible (nouvellement débloquée OU déjà débloquée auparavant)
            if (autoRouteActif && window.gameState.currentRoute < window.gameState.unlockedRoute) {
                window.changeRoute(1); // Gère déjà spawnWave, l'UI et la sauvegarde
                return;
            }
        }

        window.spawnWave();
        window.sauvegarderProgression();
    };

    /**
     * Ajout d'une plante a l'inventaire (Nouvelle fonction)
     */
    window.addToInventoryPlant = function(plantName) {
        if (!window.gameState.inventairePlantes) {
            window.gameState.inventairePlantes = {};
        }

        if (!window.gameState.inventairePlantes[plantName]) {
            window.gameState.inventairePlantes[plantName] = 0;
        }

        const multiplicateur = window.boutiqueManager ? window.boutiqueManager.getPlantMultiplier() : 1;
        window.gameState.inventairePlantes[plantName] += 1 * multiplicateur;
        window.updateHeaderUI();
    };

    /**
     * Ajout Inventaire (Exporte pour Admin)
     */
    window.addToInventory = function(sapName, amount) {
        const sapInventory = window.gameState.inventaireSeves || window.gameState.inventory || {};
        if (!sapInventory[sapName]) {
            sapInventory[sapName] = 0;
        }
        sapInventory[sapName] += amount;
        window.gameState.inventaireSeves = sapInventory;
        window.gameState.inventory = sapInventory;
        window.updateHeaderUI();
        window.updateInventoryUI();
        
        // Sauvegarder a chaque gain de ressource pour eviter la perte de donnees
        window.sauvegarderProgression();
    };

    /**
     * Effet Visuel Clic (Locale)
     */
    function createClickEffect(x, y, radius) {
        if (!serreTab) return;
        
        const effectRadius = radius || CONFIG.clickRadius;
        
        const effect = document.createElement('div');
        effect.classList.add('click-effect');
        effect.style.left = `${x}px`;
        effect.style.top = `${y}px`;
        effect.style.width = `${effectRadius * 2}px`;
        effect.style.height = `${effectRadius * 2}px`;
        effect.style.marginLeft = `-${effectRadius}px`;
        effect.style.marginTop = `-${effectRadius}px`;

        serreTab.appendChild(effect);

        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 200);
    }

    /**
     * Affiche une animation visuelle lors du changement de route
     */
    window.showRouteChangeAnimation = function(routeNumber) {
        // Supprimer l'ancienne animation si elle existe encore
        const oldOverlay = document.querySelector('.route-change-overlay');
        if (oldOverlay) oldOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'route-change-overlay';
        
        // Construire le HTML avec le numero et les icones des plantes
        let plantsHtml = '';
        if (window.PLANT_DB) {
            const db = window.PLANT_DB;
            const currentIdx = routeNumber - 1;
            const prevIdx = routeNumber - 2;
            
            // Afficher la plante de la route precedente (si elle existe) puis celle de cette route
            // (images reelles au lieu des emojis, comme partout ailleurs dans le jeu)
            if (prevIdx >= 0 && db[prevIdx]) {
                plantsHtml += `<span class="route-change-plant-icon">${window.creerImgPlanteHTML(db[prevIdx].name, 'route-change-plant-img')}</span>`;
            }
            if (currentIdx >= 0 && db[currentIdx]) {
                plantsHtml += `<span class="route-change-plant-icon">${window.creerImgPlanteHTML(db[currentIdx].name, 'route-change-plant-img')}</span>`;
            }
        }
        
        overlay.innerHTML = `
            <div class="route-change-text">ROUTE ${routeNumber}</div>
            ${plantsHtml ? `<div class="route-change-plants">${plantsHtml}</div>` : ''}
        `;
        document.body.appendChild(overlay);

        // Auto-destruction apres l'animation
        setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
        }, 2000);
    };

    /**
     * Change Route (Exporte pour Admin et Liste des Routes)
     */
    window.changeRoute = function(direction) {
        const newRoute = window.gameState.currentRoute + direction;
        window.goToRoute(newRoute);
    };

    /**
     * Teleportation directe vers une route specifique
     */
    window.goToRoute = function(routeNumber) {
        if (routeNumber < 1 || routeNumber > window.gameState.unlockedRoute) return;
        
        const isDifferent = window.gameState.currentRoute !== routeNumber;
        window.gameState.currentRoute = routeNumber;

        // MODIFIE : on recharge le score de vagues deja enregistre pour cette route
        if (!window.gameState.wavesCompletedParRoute) window.gameState.wavesCompletedParRoute = {};
        window.gameState.wavesCompleted = window.gameState.wavesCompletedParRoute[routeNumber] || 0;

        window.updateRouteUI();
        window.updateHeaderUI();
        window.spawnWave();
        
        if (isDifferent) {
            window.showRouteChangeAnimation(routeNumber);
        }

        window.sauvegarderProgression();

        // Si l'overlay de la liste des routes est ouvert, on le rafraichit ou on le ferme
        if (window.routesListeManager && document.getElementById('routes-liste-overlay')) {
            window.routesListeManager.render();
        }
    };

    // --- LANCEMENT ---
    initGame();

});