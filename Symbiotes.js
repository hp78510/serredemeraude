/* symbiotes.js - Gestion des Symbiotes (IA, Combat, Visuel) */

// Initialisation du gestionnaire global
window.symbiotesManager = {
    // Liste des symbiotes ACHETES (persistance)
    achetes: [], 
    // Liste des symbiotes ACTIFS (presents sur l'ecran)
    actifs: [],
    maxActifs: 2,
    cost: 1000, // Cout en gemmes
    tailleImage: 80, // Taille (px) de l'icone du symbiote a l'ecran (doublee, etait 40px)

    // Bonus cumules via les upgrades dedies aux symbiotes (achetes dans le menu Upgrades)
    aoeBonus: 0,
    speedBonus: 0,
    
    // Chemins vers les assets
    assets: {
        'ver-racinaire': './images/symbiotes/ver-racinaire.png',
        'nevro-parasite': './images/symbiotes/nevro-parasite.png',
        'spore-porteur': './images/symbiotes/spore-porteur.png',
        'phyto-drone': './images/symbiotes/Phyto-Drone.png',
        'chloromage': './images/symbiotes/Chloromage.png',
        'scarabee-seve': './images/symbiotes/Scarabée de Sève.png'
    },

    /**
     * Sauvegarde l'etat des symbiotes dans la progression du jeu.
     */
    sauvegarderEtat: function() {
        if (window.gameState) {
            window.gameState.symbiotesAchetees = this.achetes;
        }

        if (window.sauvegarderProgression) {
            window.sauvegarderProgression();
        }
    },

    /**
     * Achete un symbiote
     * @param {string} type - 'ver-racinaire', 'nevro-parasite' ou 'spore-porteur'
     * @returns {boolean} - true si succes
     */
    acheter: function(type) {
        // Verifier si deja achete
        if (this.achetes.find(s => s.type === type)) {
            console.warn("Symbiote deja possede.");
            return false;
        }

        // Verification du cout
        if (!window.economie || !window.economie.depenserGemmes(this.cost)) {
            console.warn("Fonds insuffisants.");
            return false;
        }

        // Ajout a la liste des achetes
        const newSymbioteData = {
            id: Date.now(),
            type: type,
            isActive: false // Inactif par defaut apres achat
        };
        
        this.achetes.push(newSymbioteData);
        
        // Sauvegarder la progression (pour persister l'achat)
        this.sauvegarderEtat();

        // Mettre a jour l'interface du menu si elle est ouverte
        if (window.refreshSymbiotesMenu) {
            window.refreshSymbiotesMenu();
        }

        return true;
    },

    /**
     * Active ou Desactive un symbiote specifique
     * @param {number} id 
     */
    toggle: function(id) {
        const symbioteData = this.achetes.find(s => s.id === id);
        if (!symbioteData) return;

        if (symbioteData.isActive) {
            // Desactivation
            this.desactiver(id);
        } else {
            // Activation
            this.activer(id);
        }
        
        // Mise a jour UI Menu
        if (window.refreshSymbiotesMenu) {
            window.refreshSymbiotesMenu();
        }
    },

    /**
     * Calcule les stats actuelles d'un symbiote (toujours en % du secateur du joueur EN TEMPS REEL)
     */
    minRadius: 65, // Rayon d'action minimum garanti pour les symbiotes (px)

    getStats: function() {
        const s = window.secateur || { damage: 0, critChance: 0, critDamage: 1, attackSpeed: 500, radius: 50 };
        const speedMult = window.capsulesManager ? window.capsulesManager.getMultiplier('symbiote_speed_mult') : 1;
        const vitesseJeu = window.capsulesManager ? window.capsulesManager.getMultiplier('game_speed_mult') : 1;
        return {
            damage: Math.floor(s.damage * 0.5),
            critChance: s.critChance * 0.5,
            critDamage: s.critDamage,
            attackSpeed: Math.max(50, Math.floor(s.attackSpeed / speedMult / vitesseJeu)),
            // Le plancher minRadius garantit un rayon de base minimum, mais tout bonus
            // (upgrades, talents d'Evolution) s'ajoute TOUJOURS par-dessus, meme s'il est petit.
            radius: Math.max(this.minRadius, s.radius) + (this.aoeBonus || 0)
        };
    },

    /**
     * Active un symbiote (Creation DOM et Stats)
     * @param {number} id
     * @param {boolean} silencieux - Si true, n'affiche pas d'alerte en cas de limite atteinte (utilise au chargement de la sauvegarde)
     */
    activer: function(id, silencieux) {
        // Verifier la limite
        if (this.actifs.length >= this.maxActifs) {
            if (!silencieux) {
                alert(`Limite de ${this.maxActifs} symbiotes actifs atteinte ! Desactivez-en un autre.`);
            }
            return;
        }

        const symbioteData = this.achetes.find(s => s.id === id);
        if (!symbioteData || !window.secateur) return;

        symbioteData.isActive = true;
        this.sauvegarderEtat();

        // Creation de l'instance visuelle et logique
        const instance = this.creerInstanceVisuelle(symbioteData);
        if (instance) {
            this.actifs.push(instance);
        }
    },

    /**
     * Desactive un symbiote (Suppression DOM)
     */
    desactiver: function(id) {
        const symbioteData = this.achetes.find(s => s.id === id);
        if (symbioteData) {
            symbioteData.isActive = false;
            this.sauvegarderEtat();
        }

        // Retirer de la liste active et supprimer le DOM
        this.actifs = this.actifs.filter(inst => {
            if (inst.id === id) {
                if (inst.element && inst.element.parentNode) {
                    inst.element.parentNode.removeChild(inst.element);
                }
                return false;
            }
            return true;
        });
    },

    /**
     * Cree les elements DOM (Image + Cercle Rayon)
     */
    creerInstanceVisuelle: function(data) {
        const container = document.getElementById('game-container');
        if (!container) return null;

        const img = document.createElement('img');
        img.src = this.assets[data.type];
        img.style.width = `${this.tailleImage}px`;
        img.style.height = `${this.tailleImage}px`;
        img.style.position = 'absolute';
        img.style.zIndex = '20';
        img.style.pointerEvents = 'none'; // Ne bloque pas les clics
        
        // Position initiale aleatoire
        const startX = Math.random() * 80 + 10;
        const startY = Math.random() * 80 + 10;
        img.style.left = `${startX}%`;
        img.style.top = `${startY}%`;

        // Cercle de rayon
        const liveStats = this.getStats();
        const radiusIndicator = document.createElement('div');
        radiusIndicator.style.position = 'absolute';
        radiusIndicator.style.width = `${liveStats.radius * 2}px`;
        radiusIndicator.style.height = `${liveStats.radius * 2}px`;
        radiusIndicator.style.border = '1px dashed rgba(57, 255, 20, 0.18)';
        radiusIndicator.style.borderRadius = '50%';
        radiusIndicator.style.transform = 'translate(-50%, -50%)';
        radiusIndicator.style.pointerEvents = 'none';
        radiusIndicator.style.zIndex = '15';
        
        img.appendChild(radiusIndicator);
        container.appendChild(img);

        return {
            id: data.id,
            element: img,
            radiusIndicator: radiusIndicator,
            x: startX,
            y: startY,
            targetId: null,
            lastAttackTime: 0
        };
    },

    /**
     * BOUCLE PRINCIPALE : Met a jour tous les symbiotes actifs
     */
    update: function() {
        // Pendant un combat de boss, seul le joueur peut infliger des degats : les symbiotes sont figes
        if (window.bossManager && window.bossManager.enCombat) return;

        const plantes = window.gameState ? window.gameState.activePlants : [];
        const stats = this.getStats();

        this.actifs.forEach(symbiote => {
            // 0. Rafraichir le cercle visuel de rayon (reflete en direct tout bonus d'upgrade/talent)
            if (symbiote.radiusIndicator) {
                const diametre = stats.radius * 2;
                if (symbiote.radiusIndicator.style.width !== `${diametre}px`) {
                    symbiote.radiusIndicator.style.width = `${diametre}px`;
                    symbiote.radiusIndicator.style.height = `${diametre}px`;
                }
            }

            // 1. Gestion de la cible (pour le deplacement / poursuite)
            if (!symbiote.targetId || !this.cibleExiste(symbiote.targetId, plantes)) {
                symbiote.targetId = this.trouverCiblePlusProche(symbiote, plantes);
            }

            const cible = this.getPlanteById(symbiote.targetId, plantes);

            if (cible) {
                const distance = this.calculerDistanceCentre(symbiote, cible);

                // On ne deplace le symbiote que s'il est hors de portee d'attaque.
                // Sans cette condition, le symbiote continuait a recalculer une micro-position
                // (repulsion + poursuite) a chaque frame meme a portee, ce qui faisait trembler l'image.
                if (distance > stats.radius * 0.6) {
                    this.deplacerVers(symbiote, cible);
                }
            }

            // 2. Attaque en zone (AOE) : touche TOUTES les plantes a portee, pas que la cible suivie
            this.verifierAttaque(symbiote, plantes);
        });
    },

    /**
     * Calcule la distance (en px) entre le centre du symbiote et le centre de la cible.
     */
    calculerDistanceCentre: function(symbiote, cible) {
        const symbRect = symbiote.element.getBoundingClientRect();
        const cibleRect = cible.element.getBoundingClientRect();
        return Math.hypot(
            (cibleRect.left + cibleRect.width / 2) - (symbRect.left + symbRect.width / 2),
            (cibleRect.top + cibleRect.height / 2) - (symbRect.top + symbRect.height / 2)
        );
    },

    // --- Fonctions utilitaires internes ---

    cibleExiste: function(id, plantes) {
        return plantes.some(p => p.id === id);
    },

    /**
     * Trouve la plante la plus proche, en priorisant les plantes qui ne sont PAS deja
     * visees par un AUTRE symbiote actif (pour eviter qu'ils se regroupent tous sur
     * la meme cible). Si toutes les plantes sont deja visees (ou qu'il n'y en a pas
     * assez pour tout le monde), on retombe sur la simple plus proche.
     */
    trouverCiblePlusProche: function(symbiote, plantes) {
        if (plantes.length === 0) return null;

        const ciblesDejaPrises = this.actifs
            .filter(s => s.id !== symbiote.id && s.targetId !== null && s.targetId !== undefined)
            .map(s => s.targetId);

        const plantesLibres = plantes.filter(p => !ciblesDejaPrises.includes(p.id));
        const pool = plantesLibres.length > 0 ? plantesLibres : plantes;

        let minDist = Infinity;
        let closestPlant = null;

        pool.forEach(plant => {
            const symbRect = symbiote.element.getBoundingClientRect();
            const plantRect = plant.element.getBoundingClientRect();
            const dist = Math.hypot(
                (plantRect.left + plantRect.width/2) - (symbRect.left + symbRect.width/2),
                (plantRect.top + plantRect.height/2) - (symbRect.top + symbRect.height/2)
            );
            if (dist < minDist) {
                minDist = dist;
                closestPlant = plant;
            }
        });
        return closestPlant ? closestPlant.id : null;
    },

    getPlanteById: function(id, plantes) {
        return plantes.find(p => p.id === id);
    },

    deplacerVers: function(symbiote, cible) {
        const container = document.getElementById('game-container');
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const symbRect = symbiote.element.getBoundingClientRect();
        const cibleRect = cible.element.getBoundingClientRect();

        const currentX = symbRect.left - containerRect.left;
        const currentY = symbRect.top - containerRect.top;
        const targetX = cibleRect.left - containerRect.left + (cibleRect.width / 2);
        const targetY = cibleRect.top - containerRect.top + (cibleRect.height / 2);

        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const distance = Math.hypot(dx, dy);
        const speedMult = window.capsulesManager ? window.capsulesManager.getMultiplier('symbiote_speed_mult') : 1;
        const vitesseJeu = window.capsulesManager ? window.capsulesManager.getMultiplier('game_speed_mult') : 1;
        const speed = (3 + (this.speedBonus || 0)) * speedMult * vitesseJeu;

        let moveX = 0;
        let moveY = 0;
        if (distance > 0) {
            moveX = (dx / distance) * speed;
            moveY = (dy / distance) * speed;
        }

        let nextX = currentX + moveX;
        let nextY = currentY + moveY;

        // Garder à l'intérieur du conteneur
        nextX = Math.max(0, Math.min(containerRect.width - 40, nextX));
        nextY = Math.max(0, Math.min(containerRect.height - 40, nextY));

        // --- SÉPARATION STRICTE : aucun chevauchement autorisé ---
        const SEP_MIN = 42; // Largeur du symbiote (40px) + 2px de marge

        this.actifs.forEach(autre => {
            if (autre.id === symbiote.id) return;

            const autreRect = autre.element.getBoundingClientRect();
            const autreX = autreRect.left - containerRect.left;
            const autreY = autreRect.top - containerRect.top;

            let sepDx = nextX - autreX;
            let sepDy = nextY - autreY;
            let sepDist = Math.hypot(sepDx, sepDy);

            if (sepDist < SEP_MIN) {
                if (sepDist === 0) {
                    sepDx = 1;
                    sepDy = 0;
                    sepDist = 1;
                }
                const overlap = SEP_MIN - sepDist;
                nextX += (sepDx / sepDist) * overlap;
                nextY += (sepDy / sepDist) * overlap;
            }
        });

        // Re-clamp après séparation (au cas où elle pousserait hors du conteneur)
        nextX = Math.max(0, Math.min(containerRect.width - 40, nextX));
        nextY = Math.max(0, Math.min(containerRect.height - 40, nextY));

        const newPercentX = (nextX / containerRect.width) * 100;
        const newPercentY = (nextY / containerRect.height) * 100;

        symbiote.element.style.left = `${newPercentX}%`;
        symbiote.element.style.top = `${newPercentY}%`;
        symbiote.x = newPercentX;
        symbiote.y = newPercentY;
    },

    verifierAttaque: function(symbiote, plantes) {
        const stats = this.getStats();
        const now = Date.now();
        if (now - symbiote.lastAttackTime < stats.attackSpeed) return;

        const symbRect = symbiote.element.getBoundingClientRect();
        const symbCenterX = symbRect.left + symbRect.width / 2;
        const symbCenterY = symbRect.top + symbRect.height / 2;

        // On cherche TOUTES les plantes a portee du rayon (AOE, comme le joueur)
        const ciblesTouchees = plantes.filter(p => {
            const pRect = p.element.getBoundingClientRect();
            const pCenterX = pRect.left + pRect.width / 2;
            const pCenterY = pRect.top + pRect.height / 2;
            const dist = Math.hypot(pCenterX - symbCenterX, pCenterY - symbCenterY);
            return dist <= stats.radius;
        });

        if (ciblesTouchees.length === 0) return;

        ciblesTouchees.forEach(cible => {
            this.infligerDegats(symbiote, cible, stats);
        });

        symbiote.lastAttackTime = now;

        // Cercle d'attaque visuel, comme celui du joueur au clic
        this.creerEffetAttaque(symbiote, stats);
    },

    /**
     * Affiche un cercle d'impact au niveau du symbiote (meme principe que le clic du joueur)
     */
    creerEffetAttaque: function(symbiote, stats) {
        const container = document.getElementById('game-container');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const symbRect = symbiote.element.getBoundingClientRect();

        const centerX = (symbRect.left - containerRect.left) + (symbRect.width / 2);
        const centerY = (symbRect.top - containerRect.top) + (symbRect.height / 2);

        const effect = document.createElement('div');
        effect.classList.add('click-effect', 'click-effect-symbiote');
        effect.style.left = `${centerX}px`;
        effect.style.top = `${centerY}px`;
        effect.style.width = `${stats.radius * 2}px`;
        effect.style.height = `${stats.radius * 2}px`;
        effect.style.marginLeft = `-${stats.radius}px`;
        effect.style.marginTop = `-${stats.radius}px`;

        container.appendChild(effect);

        setTimeout(() => {
            if (effect.parentNode) effect.parentNode.removeChild(effect);
        }, 200);
    },

    infligerDegats: function(symbiote, cible, stats) {
        const s = stats || this.getStats();
        const isCrit = Math.random() < s.critChance;
        const multiplier = isCrit ? s.critDamage : 1;
        const damage = Math.floor(s.damage * multiplier);

        if (window.appliquerDegats) {
            window.appliquerDegats(cible, damage);
        }
    }
};

// Fonction pour recharger la liste des symbiotes achetes au demarrage
window.chargerSymbiotesSauvegardes = function() {
    if (window.gameState && window.gameState.symbiotesAchetees) {
        window.symbiotesManager.achetes = window.gameState.symbiotesAchetees;
    }
};

// Fonction pour reactiver visuellement les symbiotes qui etaient actifs avant le rechargement.
// A appeler apres que window.secateur soit charge (c'est le cas des le depart, il est
// initialise au chargement du script secateur.js) et que le DOM du jeu soit pret.
window.reactiverSymbiotesSauvegardes = function() {
    const manager = window.symbiotesManager;
    if (!manager || !Array.isArray(manager.achetes)) return;

    manager.achetes.forEach(symbioteData => {
        if (symbioteData.isActive) {
            // On ne recree l'instance visuelle que si elle n'existe pas deja
            const dejaActif = manager.actifs.some(inst => inst.id === symbioteData.id);
            if (!dejaActif) {
                manager.activer(symbioteData.id, true); // silencieux = true (pas d'alerte au demarrage)
            }
        }
    });
};
