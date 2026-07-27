/* admin.js - Gestion de l'Admin via raccourci clavier et Triches */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin.js est pret.");
    
    // Variables locales pour le buffer de saisie
    let keyBuffer = "";
    const SECRET_CODE = "1234";

    // Selection des elements DOM Admin
    const cheatControls = document.getElementById('cheat-controls');
    const btnCheatClear = document.getElementById('btn-cheat-clear');
    const btnCheatSkip = document.getElementById('btn-cheat-skip');
    const adminCodeInput = document.getElementById('admin-code-input');
    const btnValidateCode = document.getElementById('btn-validate-code');
    
    // Selection des onglets pour pouvoir basculer vers Admin
    const tabContents = document.querySelectorAll('.tab-content');

    // --- Fonction appelee par le bouton du Menu Global ---
    window.ouvrirPanelAdmin = function() {
        // Cacher tous les onglets
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Afficher l'onglet Admin
        const adminTab = document.getElementById('tab-admin');
        if (adminTab) {
            adminTab.classList.add('active');
        }
    };

    // --- Fonction appelee par le bouton "Retour" du panneau Admin ---
    window.fermerPanelAdmin = function() {
        // Cacher tous les onglets
        tabContents.forEach(content => content.classList.remove('active'));

        // Revenir a l'onglet principal du jeu (la Serre)
        const serreTab = document.getElementById('tab-serre');
        if (serreTab) {
            serreTab.classList.add('active');
        }
    };

    // --- Ecouteur de clavier pour le code secret ---
    window.addEventListener('keydown', (e) => {
        // On ajoute la touche pressee au buffer (seulement chiffres)
        if (e.key >= "0" && e.key <= "9") {
            keyBuffer += e.key;
            
            // On garde seulement les 4 derniers chiffres
            if (keyBuffer.length > 4) {
                keyBuffer = keyBuffer.slice(-4);
            }

            // Verification immediate
            if (keyBuffer === SECRET_CODE) {
                unlockAdmin();
                keyBuffer = ""; // Reset du buffer
            }
        }
    });

    /**
     * Debloque l'interface Admin
     */
    function unlockAdmin() {
        // Modification de l'etat global via window
        if (window.gameState) {
            window.gameState.isAdminUnlocked = true;
        }
        
        // Affichage des controles
        if (cheatControls) {
            cheatControls.style.display = 'flex';
        }
        
        console.log("Admin Unlocked!");
    }

    /**
     * Verifie le code saisi dans le champ du panneau Admin
     */
    function checkAdminCode() {
        if (!adminCodeInput) return;

        if (adminCodeInput.value === SECRET_CODE) {
            unlockAdmin();
            adminCodeInput.value = "";
            adminCodeInput.style.borderColor = "#39ff14";
        } else {
            // Feedback visuel d'erreur (bordure rouge temporaire)
            adminCodeInput.style.borderColor = "#ff3939";
            adminCodeInput.value = "";
            adminCodeInput.placeholder = "Code incorrect...";
            setTimeout(() => {
                adminCodeInput.style.borderColor = "#39ff14";
                adminCodeInput.placeholder = "Code Secret...";
            }, 1000);
        }
    }

    if (btnValidateCode) {
        btnValidateCode.addEventListener('click', checkAdminCode);
    }

    if (adminCodeInput) {
        adminCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                checkAdminCode();
            }
        });
    }

    /**
     * Triche : Clear Vague
     */
    function cheatClearWave() {
        // Verification securite
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;

        // 1. Recuperer les plantes actives
        const plantsToKill = [...window.gameState.activePlants];
        
        // 2. Crediter la seve pour chaque plante tuee en utilisant la fonction globale
        plantsToKill.forEach(plant => {
            // On utilise window.addToInventory defini dans app.js
            if (window.addToInventory) {
                window.addToInventory(plant.template.sapName, 10); // 10 seve par plante
            }
        });

        // 3. Vider le DOM manuellement (car removePlant est locale dans app.js)
        const serreTab = document.getElementById('tab-serre');
        if (serreTab) serreTab.innerHTML = '';
        
        // 4. Vider l'etat des plantes
        window.gameState.activePlants = [];

        // 5. Valider la vague manuellement
        window.gameState.wavesCompleted++;
        
        // 6. Verifier debloquage route
        if (window.gameState.wavesCompleted >= 10) {
            if (window.gameState.currentRoute === window.gameState.unlockedRoute) {
                window.gameState.unlockedRoute++;
            }
        }

        // 7. Mettre a jour l'UI
        if (window.updateRouteUI) {
            window.updateRouteUI();
        }

        // 8. Lancer la vague suivante
        if (window.spawnWave) {
            window.spawnWave();
        }
        
        alert("Vague clearee !");
    }

    /**
     * Triche : Sauter de niveau
     */
    function cheatSkipRoute() {
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;

        if (window.gameState.currentRoute < 30) {
            // Forcer le debloquage de la route suivante
            window.gameState.unlockedRoute = window.gameState.currentRoute + 2; 
            
            // Appeler la fonction globale de changement de route
            if (window.changeRoute) {
                window.changeRoute(1); // Direction 1 = Haut/Suivant
            }
            
            alert("Route superieure debloquee et selectionnee.");
        } else {
            alert("Vous etes deja a la route maximale.");
        }
    }

    // --- NOUVELLES TRICHES ECONOMIE ---

    function cheatAddGemmes() {
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;
        
        // Verifie si l'objet economie existe
        if (window.economie && window.economie.ajouterGemmes) {
            window.economie.ajouterGemmes(1000);
        } else {
            console.error("Module economie non charge ou fonction manquante.");
            alert("Erreur: Module economie non disponible.");
        }
    }

    function cheatAddGolds() {
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;

        // Verifie si l'objet economie existe
        if (window.economie && window.economie.ajouterGolds) {
            window.economie.ajouterGolds(1000000);
        } else {
            console.error("Module economie non charge ou fonction manquante.");
            alert("Erreur: Module economie non disponible.");
        }
    }

    // NOUVEAU : Ajoute des Brins Mutants (monnaie de Mutation Genetique)
    function cheatAddBrins() {
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;

        // On passe par boutiqueManager.ajouterBrins() pour respecter le perk "2X Brins Mutants"
        // exactement comme une vraie Mutation le ferait
        if (window.boutiqueManager && window.boutiqueManager.ajouterBrins) {
            window.boutiqueManager.ajouterBrins(1000);
        } else {
            window.gameState.brinsMutants = (window.gameState.brinsMutants || 0) + 1000;
            if (window.updateHeaderUI) window.updateHeaderUI();
            if (window.sauvegarderProgression) window.sauvegarderProgression();
        }
    }

    // NOUVEAU : Augmente le niveau du joueur de 1 (sans toucher a l'XP en cours)
    function cheatLevelUp() {
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;

        if (typeof window.gameState.niveau !== 'number') window.gameState.niveau = 1;
        window.gameState.niveau += 1;

        if (window.updateXpBarUI) window.updateXpBarUI();
        if (window.updateHeaderUI) window.updateHeaderUI();
        if (window.sauvegarderProgression) window.sauvegarderProgression();

        console.log(`Niveau augmente manuellement : ${window.gameState.niveau}`);
    }

    // NOUVEAU : Reset Total (efface la sauvegarde et recharge la page a zero)
    function cheatResetAll() {
        if (!window.gameState || !window.gameState.isAdminUnlocked) return;
        creerOverlayConfirmationReset();
    }

    /**
     * Overlay de confirmation "maison" (au lieu de confirm() natif, qui peut etre
     * bloque silencieusement dans certains environnements/iframes/WebView)
     */
    function creerOverlayConfirmationReset() {
        if (document.getElementById('reset-confirm-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'reset-confirm-overlay';
        overlay.className = 'menu-overlay';
        overlay.style.zIndex = '2000'; // Au-dessus de tout le reste

        overlay.innerHTML = `
            <div class="menu-content" style="max-width: 400px; padding: 25px; text-align: center;">
                <h2 style="color: #ff3939; text-shadow: 0 0 8px #ff3939; margin-bottom: 15px;">☠️ RESET TOTAL ☠️</h2>
                <p style="font-size: 0.85rem; color: #ffcccc; line-height: 1.6; margin-bottom: 20px;">
                    Ceci va effacer <strong>DEFINITIVEMENT</strong> :<br>
                    Niveau, XP, Golds, Gemmes, Plantes, Seves,<br>
                    Upgrades, Symbiotes, Brins Mutants, Boutique.<br><br>
                    <strong>Cette action est IRREVERSIBLE.</strong>
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-annuler-reset" class="admin-btn">Annuler</button>
                    <button id="btn-confirmer-reset" class="admin-btn cheat-btn">☠️ Tout Effacer</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-annuler-reset').onclick = () => overlay.remove();

        document.getElementById('btn-confirmer-reset').onclick = () => {
            overlay.remove();

            try {
                localStorage.removeItem('laSerreEmeraude_save');
                console.log("Sauvegarde supprimee avec succes. Rechargement...");
            } catch (e) {
                console.error("Erreur lors de la suppression de la sauvegarde:", e);
                alert("Erreur : impossible de supprimer la sauvegarde. Voir la console.");
                return;
            }

            window.location.reload();
        };

        // Fermeture si on clique en dehors de la boite
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    }

    // --- INJECTION DES BOUTONS DANS LE DOM ---
    
    // On cree les boutons dynamiquement pour eviter de modifier le HTML si on veut tout gerer en JS
    // Mais comme le HTML est deja defini dans index.html, on va simplement ajouter les ecouteurs
    // SI les boutons existent deja dans le HTML. 
    // HOWEVER, pour plus de flexibilite et pour respecter la demande "donne le code HTML/JS",
    // je vais injecter les boutons directement dans la div cheat-controls si elle existe.

    if (cheatControls) {
        // Creation du bouton Gemmes
        const btnGemmes = document.createElement('button');
        btnGemmes.className = 'admin-btn cheat-btn-btn-gemmes';
        btnGemmes.innerHTML = '<span>💎</span> Ajouter 1000 Gemmes';
        btnGemmes.onclick = cheatAddGemmes;

        // Creation du bouton Golds
        const btnGolds = document.createElement('button');
        btnGolds.className = 'admin-btn cheat-btn-btn-golds';
        btnGolds.innerHTML = '<span>💰</span> Ajouter 1M Gold';
        btnGolds.onclick = cheatAddGolds;

        // NOUVEAU : Creation du bouton Brins Mutants
        const btnBrins = document.createElement('button');
        btnBrins.className = 'admin-btn cheat-btn-btn-brins';
        btnBrins.innerHTML = '<span>🧬</span> Ajouter 1000 Brins Mutants';
        btnBrins.onclick = cheatAddBrins;

        // NOUVEAU : Creation du bouton Level Up
        const btnLevelUp = document.createElement('button');
        btnLevelUp.className = 'admin-btn cheat-btn-btn-levelup';
        btnLevelUp.innerHTML = '<span>⭐</span> +1 Niveau';
        btnLevelUp.onclick = cheatLevelUp;

        // NOUVEAU : Creation du bouton Reset Total
        const btnResetAll = document.createElement('button');
        btnResetAll.className = 'admin-btn cheat-btn-reset-all';
        btnResetAll.innerHTML = '<span>☠️</span> RESET TOTAL';
        btnResetAll.onclick = cheatResetAll;

        // Ajout au DOM
        cheatControls.appendChild(btnGemmes);
        cheatControls.appendChild(btnGolds);
        cheatControls.appendChild(btnBrins);
        cheatControls.appendChild(btnLevelUp);
        cheatControls.appendChild(btnResetAll);

        // Injection des styles CSS specifiques pour ces boutons
        if (!document.getElementById('admin-cheat-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-cheat-styles';
            style.textContent = `
                .cheat-btn-btn-gemmes {
                    background-color: rgba(0, 100, 255, 0.2);
                    border: 1px solid #4da6ff;
                    color: #aaddff;
                }
                .cheat-btn-btn-gemmes:hover {
                    background-color: rgba(0, 100, 255, 0.4);
                    box-shadow: 0 0 10px #4da6ff;
                }

                .cheat-btn-btn-golds {
                    background-color: rgba(255, 215, 0, 0.2);
                    border: 1px solid #ffd700;
                    color: #fffacd;
                }
                .cheat-btn-btn-golds:hover {
                    background-color: rgba(255, 215, 0, 0.4);
                    box-shadow: 0 0 10px #ffd700;
                }

                .cheat-btn-btn-brins {
                    background-color: rgba(185, 103, 255, 0.2);
                    border: 1px solid #b967ff;
                    color: #e0c3ff;
                }
                .cheat-btn-btn-brins:hover {
                    background-color: rgba(185, 103, 255, 0.4);
                    box-shadow: 0 0 10px #b967ff;
                }

                .cheat-btn-btn-levelup {
                    background-color: rgba(57, 255, 20, 0.2);
                    border: 1px solid #39ff14;
                    color: #ccffcc;
                }
                .cheat-btn-btn-levelup:hover {
                    background-color: rgba(57, 255, 20, 0.4);
                    box-shadow: 0 0 10px #39ff14;
                }

                .cheat-btn-reset-all {
                    background-color: rgba(255, 0, 0, 0.25);
                    border: 2px solid #ff0000;
                    color: #ffdddd;
                    font-weight: bold;
                    margin-top: 10px;
                }
                .cheat-btn-reset-all:hover {
                    background-color: rgba(255, 0, 0, 0.5);
                    box-shadow: 0 0 15px #ff0000;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // --- Attacher les ecouteurs aux boutons existants (Clear/Skip) ---
    if (btnCheatClear) {
        btnCheatClear.addEventListener('click', cheatClearWave);
    }
    
    if (btnCheatSkip) {
        btnCheatSkip.addEventListener('click', cheatSkipRoute);
    }

    // Tes fonctions de triche
    window.tricheAddGold = function() {
        if (window.economie && typeof window.economie.ajouterGolds === 'function') {
            window.economie.ajouterGolds(1000000);
            console.log("1M Gold ajoute");
        } else {
            console.error("Erreur : Module economie non trouve.");
        }
    };
});