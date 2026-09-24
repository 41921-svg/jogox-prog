/**
 * CAMISA11 — Football Career & Manager
 * app.js — Controlador Central de Interface, Fluxo de Carreira, Modais e Eventos
 */

const Game = {
  state: null,
  currentTab: 'dashboard',
  squadViewMode: 'pitch', // 'pitch' ou 'list'
  inspectingPlayer: null,
  swapTargetSlot: null,
  createdClubDraft: null,
  selectedExistingClub: null,
  selectedDifficulty: 'normal',

  // Inicialização Geral da Aplicação
  init() {
    SoundEngine.init();

    // 1. Tenta carregar save existente
    const saved = StorageManager.loadGame();
    if (saved && saved.club && saved.squad && saved.squad.length >= 11) {
      this.state = saved;
      // Garante integridade do SeasonManager
      if (this.state.seasonClubs) {
        SeasonManager.standings = this.state.seasonStandings || [];
        SeasonManager.fixtures = this.state.seasonFixtures || [];
        SeasonManager.currentRound = this.state.seasonRound || 1;
        SeasonManager.currentSeasonYear = this.state.seasonYear || 2026;
      }
      TacticsManager.currentFormation = this.state.tactics ? this.state.tactics.formation : '4-3-3';
      TacticsManager.mentality = this.state.tactics ? this.state.tactics.mentality : 'EQUILIBRADA';
      TacticsManager.pressing = this.state.tactics ? this.state.tactics.pressing : 'NORMAL';

      this.onGameReady();
    } else {
      // Primeira execução ou sem save: abre o fluxo de onboarding
      this.openOnboarding('welcome');
    }

    // 2. Registra eventos de UI
    this.setupEventListeners();

    // 3. Salva automaticamente a cada 20 segundos
    setInterval(() => {
      this.saveCurrentGame();
    }, 20000);
  },

  // Chamado quando o jogo está com clube e elenco carregados
  onGameReady() {
    this.closeModal('modal-onboarding');
    this.updateHeader();
    this.switchTab('dashboard');

    // Inicializa mercado se estiver vazio
    if (!TransferMarket.availablePlayers || TransferMarket.availablePlayers.length === 0) {
      TransferMarket.refreshMarket(this.state.club.ovr, 8);
    }

    // Inicializa Canvas do jogo
    const canvasEl = document.getElementById('match-canvas-game');
    if (canvasEl) {
      MatchCanvas.init(canvasEl);
    }
  },

  // Salva o estado atual
  saveCurrentGame() {
    if (!this.state || !this.state.club) return;
    this.state.seasonStandings = SeasonManager.standings;
    this.state.seasonFixtures = SeasonManager.fixtures;
    this.state.seasonRound = SeasonManager.currentRound;
    this.state.seasonYear = SeasonManager.currentSeasonYear;
    this.state.tactics = {
      formation: TacticsManager.currentFormation,
      mentality: TacticsManager.mentality,
      pressing: TacticsManager.pressing
    };
    StorageManager.saveGame(this.state);
  },

  // Atualiza os recursos do topo (Escudo, Clube, Orçamento, OVR, Temporada)
  updateHeader() {
    if (!this.state || !this.state.club) return;
    const c = this.state.club;

    // Escudo SVG
    const badgeContainer = document.getElementById('top-badge-container');
    if (badgeContainer) {
      badgeContainer.innerHTML = ClubManager.renderBadge(c, 36);
    }

    const clubNameEl = document.getElementById('top-club-name');
    if (clubNameEl) clubNameEl.textContent = c.name;

    const brandClubEl = document.getElementById('brand-club-name');
    if (brandClubEl) brandClubEl.textContent = c.name;

    // Orçamento Formatado
    const budgetEl = document.getElementById('top-budget');
    if (budgetEl) budgetEl.textContent = `R$ ${(c.budget || 0).toLocaleString('pt-BR')}`;

    // OVR Médio
    const ovr = ClubManager.calculateTeamOvr(this.state.squad);
    c.ovr = ovr;
    const ovrEl = document.getElementById('top-ovr');
    if (ovrEl) ovrEl.textContent = `⭐ ${ovr} OVR`;

    // Temporada
    const seasonEl = document.getElementById('top-season');
    if (seasonEl) seasonEl.textContent = `📅 Temporada ${SeasonManager.currentSeasonYear}`;
  },

  // Alterna abas principais de navegação
  switchTab(tabId) {
    this.currentTab = tabId;

    // Atualiza botões da sidebar e bottom nav
    document.querySelectorAll('.nav-item, .mobile-nav-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Oculta todas as panes e exibe a selecionada
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const activePane = document.getElementById(`pane-${tabId}`);
    if (activePane) activePane.classList.add('active');

    // Atualizações específicas de tela
    switch (tabId) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'squad':
        this.renderSquad();
        break;
      case 'matches':
        this.renderMatches();
        break;
      case 'market':
        this.renderMarket();
        break;
      case 'standings':
        this.renderStandings();
        break;
      case 'ranking':
        this.renderRanking();
        break;
      case 'career':
        this.renderCareer();
        break;
    }
  },

  // ============================================================================
  // 1. DASHBOARD (INÍCIO)
  // ============================================================================
  renderDashboard() {
    if (!this.state) return;
    const userMatch = SeasonManager.getUserMatch(SeasonManager.currentRound, this.state.club.id);

    // Próxima Partida
    const nextCard = document.getElementById('dash-next-match-card');
    if (nextCard && userMatch) {
      const isHome = userMatch.homeId === this.state.club.id;
      const rivalName = isHome ? userMatch.awayName : userMatch.homeName;
      const rivalOvr = isHome ? userMatch.awayOvr : userMatch.homeOvr;
      const rivalClub = this.state.seasonClubs.find(c => c.id === (isHome ? userMatch.awayId : userMatch.homeId)) || { primaryColor: '#dc2626', secondaryColor: '#fff', badgeShape: 'circle', badgeSymbol: 'star' };

      document.getElementById('dash-home-badge').innerHTML = ClubManager.renderBadge(isHome ? this.state.club : rivalClub, 44);
      document.getElementById('dash-home-name').textContent = isHome ? this.state.club.name : rivalName;
      document.getElementById('dash-home-ovr').textContent = `${isHome ? this.state.club.ovr : rivalOvr} OVR`;

      document.getElementById('dash-away-badge').innerHTML = ClubManager.renderBadge(isHome ? rivalClub : this.state.club, 44);
      document.getElementById('dash-away-name').textContent = isHome ? rivalName : this.state.club.name;
      document.getElementById('dash-away-ovr').textContent = `${isHome ? rivalOvr : this.state.club.ovr} OVR`;

      document.getElementById('dash-match-round-text').textContent = `🏆 ${this.state.season.division} · Rodada ${SeasonManager.currentRound} de 18`;
    }

    // Último Resultado
    const lastResBox = document.getElementById('dash-last-result-box');
    if (lastResBox) {
      if (this.state.lastMatchResult) {
        const lr = this.state.lastMatchResult;
        const statusBadge = lr.resultStatus === 'WIN' 
          ? '<span class="status-badge win">🟢 VITÓRIA</span>' 
          : lr.resultStatus === 'DRAW' 
            ? '<span class="status-badge draw">🟡 EMPATE</span>' 
            : '<span class="status-badge loss">🔴 DERROTA</span>';

        lastResBox.innerHTML = `
          <div style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px;">
            ${lr.homeName} ${lr.homeScore} × ${lr.awayScore} ${lr.awayName}
          </div>
          <div>${statusBadge}</div>
        `;
      } else {
        lastResBox.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Nenhuma partida disputada ainda.</span>';
      }
    }

    // Mini Tabela de Classificação (Top 4)
    const miniTableBody = document.getElementById('dash-mini-table-body');
    if (miniTableBody) {
      miniTableBody.innerHTML = '';
      const top4 = SeasonManager.standings.slice(0, 4);
      top4.forEach((s, idx) => {
        const isUser = s.clubId === this.state.club.id;
        const tr = document.createElement('tr');
        if (isUser) tr.className = 'table-user-row';
        tr.innerHTML = `
          <td><strong>${idx + 1}º</strong></td>
          <td>${s.name} ${isUser ? '⭐' : ''}</td>
          <td><strong>${s.points}</strong></td>
          <td>${s.played}</td>
          <td>${s.goalDiff > 0 ? '+' + s.goalDiff : s.goalDiff}</td>
        `;
        miniTableBody.appendChild(tr);
      });
    }
  },

  // ============================================================================
  // 2. ELENCO & ESCALAÇÃO 2D
  // ============================================================================
  renderSquad() {
    if (!this.state) return;

    // Atualiza badges de tática
    document.getElementById('squad-ovr-val').textContent = `${this.state.club.ovr} OVR`;
    document.getElementById('squad-formation-val').textContent = TacticsManager.currentFormation;

    // Atualiza botões da formação selecionada
    document.querySelectorAll('.formation-pill').forEach(btn => {
      if (btn.getAttribute('data-formation') === TacticsManager.currentFormation) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Renderiza o Campo Tático 2D
    TacticsManager.renderPitch('pitch-starters-slots', this.state.squad, (slotIdx, player) => {
      this.handlePitchSlotClick(slotIdx, player);
    });

    // Renderiza o Banco de Reservas
    const benchContainer = document.getElementById('bench-players-list');
    if (benchContainer) {
      benchContainer.innerHTML = '';
      const bench = this.state.squad.filter(p => !p.isStarter);

      bench.forEach(p => {
        const item = document.createElement('div');
        item.className = 'bench-player-row';
        item.innerHTML = `
          <div class="ovr-badge-sm ${this.getOvrColorClass(p.ovr)}">${p.ovr}</div>
          <div style="flex: 1; margin-left: 10px;">
            <div style="font-weight: 700; font-size: 0.9rem;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${p.pos} · ${p.age} anos · ⚡ ${p.energy}%</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="Game.onBenchSwapClick('${p.id}')">
            TROCAR
          </button>
        `;
        benchContainer.appendChild(item);
      });
    }

    // Renderiza a Lista Completa de Atletas (se modo lista)
    const squadListContainer = document.getElementById('squad-full-list-container');
    if (squadListContainer) {
      squadListContainer.innerHTML = '';
      this.state.squad.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card-row';
        card.innerHTML = `
          <div class="player-card-ovr ${this.getOvrColorClass(p.ovr)}">${p.ovr}</div>
          <div class="player-card-info">
            <div class="player-card-name">${p.name} ${p.isStarter ? '<span class="starter-tag">TITULAR</span>' : ''}</div>
            <div class="player-card-meta">${p.pos} · ${p.age} anos · R$ ${(p.value || 0).toLocaleString('pt-BR')}</div>
          </div>
          <div class="player-card-energy">
            <div style="font-size: 0.8rem; font-weight: 800; color: ${p.energy < 60 ? 'var(--red)' : 'var(--accent)'};">
              ⚡ ${p.energy}%
            </div>
            <div class="energy-mini-bar">
              <div class="energy-mini-fill" style="width: ${p.energy}%; background: ${p.energy < 60 ? 'var(--red)' : 'var(--accent)'};"></div>
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          this.openPlayerModal(p);
        });
        squadListContainer.appendChild(card);
      });
    }
  },

  // Alterna entre visualização de Campo e Lista
  toggleSquadView(mode) {
    this.squadViewMode = mode;
    const pitchView = document.getElementById('squad-pitch-view');
    const listView = document.getElementById('squad-list-view');
    const btnPitch = document.getElementById('btn-view-pitch');
    const btnList = document.getElementById('btn-view-list');

    if (mode === 'pitch') {
      if (pitchView) pitchView.style.display = 'block';
      if (listView) listView.style.display = 'none';
      if (btnPitch) btnPitch.classList.add('active');
      if (btnList) btnList.classList.remove('active');
    } else {
      if (pitchView) pitchView.style.display = 'none';
      if (listView) listView.style.display = 'block';
      if (btnPitch) btnPitch.classList.remove('active');
      if (btnList) btnList.classList.add('active');
    }
  },

  // Clique em um slot do campo 2D
  handlePitchSlotClick(slotIndex, player) {
    if (this.swapTargetSlot === null) {
      this.swapTargetSlot = slotIndex;
      TacticsManager.selectedSlotIndex = slotIndex;
      this.renderSquad();
      this.showToast('Selecione um jogador do banco ou titular para trocar');
    } else {
      // Se clicou em outro slot, realiza troca entre os dois titulares
      const playerB = this.state.squad.find(p => p.isStarter && p.slotIndex === slotIndex);
      if (playerB) {
        TacticsManager.swapPlayers(this.state.squad, this.swapTargetSlot, playerB.id);
      }
      this.swapTargetSlot = null;
      TacticsManager.selectedSlotIndex = null;
      this.renderSquad();
      this.saveCurrentGame();
    }
  },

  // Clique no botão trocar do banco
  onBenchSwapClick(playerId) {
    if (this.swapTargetSlot !== null) {
      TacticsManager.swapPlayers(this.state.squad, this.swapTargetSlot, playerId);
      this.swapTargetSlot = null;
      TacticsManager.selectedSlotIndex = null;
      this.renderSquad();
      this.saveCurrentGame();
      this.showToast('Substituição realizada com sucesso!');
    } else {
      // Abre modal de seleção de slot ou pede para clicar no titular
      this.showToast('Clique primeiro na posição do campo que deseja substituir.');
    }
  },

  // Auto Escalar
  autoLineup() {
    ClubManager.assignDefaultStarters(this.state.squad, TacticsManager.currentFormation);
    this.renderSquad();
    this.updateHeader();
    this.saveCurrentGame();
    this.showToast('Elenco escalado automaticamente com os melhores atletas!');
  },

  // Troca de Formação
  setFormation(formationName) {
    TacticsManager.setFormation(formationName, this.state.squad);
    this.renderSquad();
    this.updateHeader();
    this.saveCurrentGame();
    this.showToast(`Formação alterada para ${formationName}`);
  },

  // ============================================================================
  // 3. TELA DE PARTIDAS & PRÉ-JOGO
  // ============================================================================
  renderMatches() {
    const userMatch = SeasonManager.getUserMatch(SeasonManager.currentRound, this.state.club.id);
    if (!userMatch) return;

    const isHome = userMatch.homeId === this.state.club.id;
    const rivalName = isHome ? userMatch.awayName : userMatch.homeName;
    const rivalOvr = isHome ? userMatch.awayOvr : userMatch.homeOvr;
    const rivalClub = this.state.seasonClubs.find(c => c.id === (isHome ? userMatch.awayId : userMatch.homeId)) || { primaryColor: '#dc2626', secondaryColor: '#fff', badgeShape: 'circle', badgeSymbol: 'star' };

    document.getElementById('matches-comp-title').textContent = `${this.state.season.division} · RODADA ${SeasonManager.currentRound} DE 18`;

    document.getElementById('matches-home-badge').innerHTML = ClubManager.renderBadge(isHome ? this.state.club : rivalClub, 56);
    document.getElementById('matches-home-name').textContent = isHome ? this.state.club.name : rivalName;
    document.getElementById('matches-home-ovr').textContent = `${isHome ? this.state.club.ovr : rivalOvr} OVR`;

    document.getElementById('matches-away-badge').innerHTML = ClubManager.renderBadge(isHome ? rivalClub : this.state.club, 56);
    document.getElementById('matches-away-name').textContent = isHome ? rivalName : this.state.club.name;
    document.getElementById('matches-away-ovr').textContent = `${isHome ? rivalOvr : this.state.club.ovr} OVR`;
  },

  // Abre Modal Pré-Jogo com ajustes táticos
  openPreMatchModal() {
    const userMatch = SeasonManager.getUserMatch(SeasonManager.currentRound, this.state.club.id);
    if (!userMatch) return;

    const isHome = userMatch.homeId === this.state.club.id;
    const rivalName = isHome ? userMatch.awayName : userMatch.homeName;
    const rivalOvr = isHome ? userMatch.awayOvr : userMatch.homeOvr;
    const rivalClub = this.state.seasonClubs.find(c => c.id === (isHome ? userMatch.awayId : userMatch.homeId)) || { primaryColor: '#dc2626', secondaryColor: '#fff', badgeShape: 'circle', badgeSymbol: 'star' };

    document.getElementById('prematch-home-badge').innerHTML = ClubManager.renderBadge(isHome ? this.state.club : rivalClub, 50);
    document.getElementById('prematch-home-name').textContent = isHome ? this.state.club.name : rivalName;
    document.getElementById('prematch-home-ovr').textContent = `${isHome ? this.state.club.ovr : rivalOvr} OVR`;

    document.getElementById('prematch-away-badge').innerHTML = ClubManager.renderBadge(isHome ? rivalClub : this.state.club, 50);
    document.getElementById('prematch-away-name').textContent = isHome ? rivalName : this.state.club.name;
    document.getElementById('prematch-away-ovr').textContent = `${isHome ? rivalOvr : this.state.club.ovr} OVR`;

    this.updateTacticsButtonUI();
    this.openModal('modal-prematch');
  },

  // Atualiza botões de mentalidade e pressão no Pré-Jogo
  updateTacticsButtonUI() {
    document.querySelectorAll('.tactic-mentality-btn').forEach(btn => {
      if (btn.getAttribute('data-val') === TacticsManager.mentality) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.tactic-pressure-btn').forEach(btn => {
      if (btn.getAttribute('data-val') === TacticsManager.pressing) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  setTacticMentality(val) {
    TacticsManager.setMentality(val);
    this.updateTacticsButtonUI();
  },

  setTacticPressure(val) {
    TacticsManager.setPressing(val);
    this.updateTacticsButtonUI();
  },

  // Inicia a Partida Jogável com Highlights
  startPlayableMatch() {
    this.closeModal('modal-prematch');
    const userMatch = SeasonManager.getUserMatch(SeasonManager.currentRound, this.state.club.id);
    if (!userMatch) return;

    const isHome = userMatch.homeId === this.state.club.id;
    const rivalClub = this.state.seasonClubs.find(c => c.id === (isHome ? userMatch.awayId : userMatch.homeId));

    // Abre a tela cheia da partida
    this.openModal('modal-match-screen');

    // Inicializa o placar no topo da partida
    document.getElementById('match-home-badge').innerHTML = ClubManager.renderBadge(isHome ? this.state.club : rivalClub, 32);
    document.getElementById('match-home-name').textContent = isHome ? this.state.club.shortName : rivalClub.shortName;

    document.getElementById('match-away-badge').innerHTML = ClubManager.renderBadge(isHome ? rivalClub : this.state.club, 32);
    document.getElementById('match-away-name').textContent = isHome ? rivalClub.shortName : this.state.club.shortName;

    MatchSimulator.startPlayableMatch(userMatch, this.state.club, rivalClub, this.state.squad, (summary) => {
      this.onMatchEnded(summary);
    });
  },

  // Simulação Instantânea (Pular Partida)
  simulateMatchInstantly() {
    this.closeModal('modal-prematch');
    const userMatch = SeasonManager.getUserMatch(SeasonManager.currentRound, this.state.club.id);
    if (!userMatch) return;

    const isHome = userMatch.homeId === this.state.club.id;
    const rivalClub = this.state.seasonClubs.find(c => c.id === (isHome ? userMatch.awayId : userMatch.homeId));

    const simResult = MatchSimulator.simulateInstantly(userMatch, this.state.club, rivalClub, this.state.squad);

    const userScore = isHome ? simResult.homeScore : simResult.awayScore;
    const rivalScore = isHome ? simResult.awayScore : simResult.homeScore;

    let resultStatus = 'DRAW';
    if (userScore > rivalScore) resultStatus = 'WIN';
    else if (userScore < rivalScore) resultStatus = 'LOSS';

    const crowd = Math.round(this.state.club.stadiumCapacity * 0.8);
    const ticketRevenue = isHome ? Math.round(crowd * 22) : 0;
    const winBonus = resultStatus === 'WIN' ? 40000 : resultStatus === 'DRAW' ? 15000 : 5000;
    const totalMatchMoney = ticketRevenue + winBonus;

    this.state.club.budget += totalMatchMoney;

    const repGain = resultStatus === 'WIN' ? 2 : resultStatus === 'LOSS' ? -1 : 0;
    this.state.manager.reputation = Math.max(10, Math.min(100, this.state.manager.reputation + repGain));
    this.state.manager.matches++;
    if (resultStatus === 'WIN') this.state.manager.wins++;

    this.onMatchEnded({
      homeScore: simResult.homeScore,
      awayScore: simResult.awayScore,
      userScore,
      rivalScore,
      resultStatus,
      goalsTimeline: simResult.goalsTimeline,
      crowd,
      ticketRevenue,
      winBonus,
      totalMatchMoney,
      repGain
    });
  },

  // Chamado quando a partida termina (jogável ou simulada)
  onMatchEnded(summary) {
    this.closeModal('modal-match-screen');

    // Registra na temporada
    SeasonManager.recordUserMatchResult(SeasonManager.currentRound, this.state.club.id, summary.homeScore, summary.awayScore);

    // Guarda histórico do último resultado
    this.state.lastMatchResult = {
      homeName: this.state.club.name,
      awayName: 'Adversário',
      homeScore: summary.homeScore,
      awayScore: summary.awayScore,
      resultStatus: summary.resultStatus
    };

    // Atualiza Mercado após cada rodada
    TransferMarket.refreshMarket(this.state.club.ovr, 8);

    // Abre Modal de Resultado Pós-Jogo
    this.renderPostMatchModal(summary);
    this.updateHeader();
    this.saveCurrentGame();
  },

  // Renderiza Modal Pós-Jogo
  renderPostMatchModal(summary) {
    document.getElementById('post-match-score').textContent = `${summary.homeScore} × ${summary.awayScore}`;

    const badgeEl = document.getElementById('post-match-status-badge');
    if (summary.resultStatus === 'WIN') {
      badgeEl.className = 'status-badge win';
      badgeEl.textContent = '🟢 VITÓRIA (+3 PTS)';
    } else if (summary.resultStatus === 'DRAW') {
      badgeEl.className = 'status-badge draw';
      badgeEl.textContent = '🟡 EMPATE (+1 PT)';
    } else {
      badgeEl.className = 'status-badge loss';
      badgeEl.textContent = '🔴 DERROTA (+0 PTS)';
    }

    // Timeline de gols
    const timelineEl = document.getElementById('post-match-timeline');
    timelineEl.innerHTML = '';
    if (summary.goalsTimeline && summary.goalsTimeline.length > 0) {
      summary.goalsTimeline.forEach(g => {
        const item = document.createElement('div');
        item.style.padding = '4px 0';
        item.style.fontSize = '0.88rem';
        item.innerHTML = `⚽ ${g.scorer} ${g.minute}'`;
        timelineEl.appendChild(item);
      });
    } else {
      timelineEl.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">Nenhum gol marcado na partida.</span>';
    }

    // Recompensas
    document.getElementById('post-reward-money').textContent = `💰 +R$ ${summary.totalMatchMoney.toLocaleString('pt-BR')}`;
    document.getElementById('post-reward-rep').textContent = `💼 Reputação: ${summary.repGain >= 0 ? '+' : ''}${summary.repGain}`;

    this.openModal('modal-match-result');
  },

  // Fecha tela pós-jogo e checa se a temporada acabou
  closePostMatch() {
    this.closeModal('modal-match-result');

    if (SeasonManager.seasonFinished) {
      this.handleSeasonEnd();
    } else {
      this.switchTab('dashboard');
    }
  },

  // ============================================================================
  // 4. FIM DE TEMPORADA & TRANSIÇÃO
  // ============================================================================
  handleSeasonEnd() {
    const report = SeasonManager.processSeasonEnd(this.state.club, this.state.squad, this.state.manager);

    document.getElementById('season-end-title').textContent = `TEMPORADA ${report.seasonYear} ENCERRADA!`;
    document.getElementById('season-end-rank-text').textContent = `Você terminou em ${report.userRank}º Lugar!`;

    const statusMsg = report.isChampion
      ? '🏆 PARABÉNS! SEU CLUBE É O CAMPEÃO!'
      : report.isPromoted
        ? '⬆️ ACESSO CONQUISTADO! PROMOÇÃO GARANTIDA!'
        : report.isRelegated
          ? '⬇️ REBAIXAMENTO. UMA TEMPORADA DIFÍCIL.'
          : 'Permanência assegurada na divisão.';

    document.getElementById('season-end-status-msg').textContent = statusMsg;
    document.getElementById('season-end-prize').textContent = `💰 Premiação: +R$ ${report.prizeMoney.toLocaleString('pt-BR')}`;

    // Novos Jovens da Base
    const youthContainer = document.getElementById('season-end-youth-list');
    if (youthContainer) {
      youthContainer.innerHTML = '';
      report.youthTalents.forEach(yt => {
        const item = document.createElement('div');
        item.innerHTML = `🌟 <strong>${yt.name}</strong> (${yt.pos} · ${yt.age} anos · ${yt.ovr} OVR)`;
        youthContainer.appendChild(item);
      });
    }

    // Checa propostas de outros clubes
    const offers = CareerManager.generateJobOffers(this.state.manager, this.state.club);
    const offersContainer = document.getElementById('season-end-offers-list');
    if (offersContainer) {
      offersContainer.innerHTML = '';
      if (offers.length > 0) {
        offers.forEach(off => {
          const offCard = document.createElement('div');
          offCard.className = 'job-offer-card';
          offCard.innerHTML = `
            <div>
              <div style="font-weight: 800; font-size: 1.05rem;">${off.name}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">${off.division} · ⭐ ${off.ovr} OVR · 💰 R$ ${(off.budget).toLocaleString('pt-BR')}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Game.acceptJobOffer('${off.clubId}')">
              ACEITAR PROPOSTA
            </button>
          `;
          offersContainer.appendChild(offCard);
        });
      } else {
        offersContainer.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">Nenhuma proposta recebida nesta temporada.</span>';
      }
    }

    this.openModal('modal-season-end');
    this.saveCurrentGame();
  },

  // Aceitar Proposta de Outro Clube
  acceptJobOffer(clubId) {
    const offers = CareerManager.generateJobOffers(this.state.manager, this.state.club);
    const offer = offers.find(o => o.clubId === clubId);
    if (!offer) return;

    CareerManager.acceptJobOffer(offer, this.state);
    this.showToast(`Você assumiu o comando do ${offer.name}!`);
    this.advanceToNextSeason();
  },

  // Avança para a Temporada Seguinte
  advanceToNextSeason() {
    this.closeModal('modal-season-end');
    SeasonManager.startNextSeason(this.state.seasonClubs, this.state.club.id);
    this.updateHeader();
    this.switchTab('dashboard');
    this.saveCurrentGame();
    this.showToast(`Temporada ${SeasonManager.currentSeasonYear} Iniciada!`);
  },

  // ============================================================================
  // 5. MERCADO DA BOLA
  // ============================================================================
  renderMarket() {
    const container = document.getElementById('market-cards-container');
    if (!container) return;

    container.innerHTML = '';
    const players = TransferMarket.getFilteredPlayers();

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'market-player-card';
      const canAfford = this.state.club.budget >= p.value;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 800; font-size: 1.05rem;">${p.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${p.pos} · ${p.age} anos · Potencial: ${p.potential}</div>
          </div>
          <div class="ovr-badge-sm ${this.getOvrColorClass(p.ovr)}">${p.ovr}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
          <div style="font-weight: 800; color: var(--accent); font-size: 0.95rem;">
            R$ ${p.value.toLocaleString('pt-BR')}
          </div>
          <button class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} btn-sm" ${!canAfford ? 'disabled' : ''} onclick="Game.buyMarketPlayer('${p.id}')">
            COMPRAR
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  },

  setMarketFilter(filter) {
    TransferMarket.currentFilter = filter;
    document.querySelectorAll('.market-filter-pill').forEach(btn => {
      if (btn.getAttribute('data-filter') === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    this.renderMarket();
  },

  buyMarketPlayer(playerId) {
    const res = TransferMarket.buyPlayer(playerId, this.state.club, this.state.squad);
    if (res.success) {
      SoundEngine.playKick(false);
      this.updateHeader();
      this.renderMarket();
      this.saveCurrentGame();
      this.showToast(res.message);
    } else {
      this.showToast(res.message);
    }
  },

  // ============================================================================
  // 6. CAMPEONATO (TABELA DE CLASSIFICAÇÃO)
  // ============================================================================
  renderStandings() {
    const tbody = document.getElementById('league-standings-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    document.getElementById('standings-round-badge').textContent = `Rodada ${SeasonManager.currentRound} de 18`;

    SeasonManager.standings.forEach((s, idx) => {
      const isUser = s.clubId === this.state.club.id;
      const rank = idx + 1;
      const isPromo = rank <= 2;
      const isReleg = rank >= 9;

      const tr = document.createElement('tr');
      if (isUser) tr.className = 'table-user-row';
      tr.innerHTML = `
        <td class="${isPromo ? 'zone-promo' : isReleg ? 'zone-releg' : ''}"><strong>${rank}º</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${ClubManager.renderBadge(s, 22)}
            <span>${s.name} ${isUser ? '⭐' : ''}</span>
          </div>
        </td>
        <td><strong>${s.points}</strong></td>
        <td>${s.played}</td>
        <td>${s.won}</td>
        <td>${s.drawn}</td>
        <td>${s.lost}</td>
        <td>${s.goalsFor}</td>
        <td>${s.goalsAgainst}</td>
        <td>${s.goalDiff > 0 ? '+' + s.goalDiff : s.goalDiff}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  // ============================================================================
  // 7. RANKING GLOBAL DE CLUBES
  // ============================================================================
  renderRanking() {
    const tbody = document.getElementById('global-ranking-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const globalRankings = CareerManager.generateGlobalRanking(this.state.club);

    globalRankings.forEach(c => {
      const tr = document.createElement('tr');
      if (c.isUser) tr.className = 'table-user-row';
      tr.innerHTML = `
        <td><strong>#${c.rank}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${ClubManager.renderBadge(c, 24)}
            <span>${c.name} ${c.isUser ? '⭐' : ''}</span>
          </div>
        </td>
        <td>⭐ ${c.ovr}</td>
        <td>🏆 ${c.titles || 0}</td>
        <td style="color: var(--accent);">R$ ${(c.budget || 0).toLocaleString('pt-BR')}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  // ============================================================================
  // 8. CARREIRA DO TREINADOR
  // ============================================================================
  renderCareer() {
    if (!this.state || !this.state.manager) return;
    const m = this.state.manager;

    document.getElementById('career-manager-name').textContent = m.name || 'Treinador';
    document.getElementById('career-club-name').textContent = this.state.club.name;
    document.getElementById('career-rep-val').textContent = `${m.reputation}/100`;
    document.getElementById('career-rep-fill').style.width = `${m.reputation}%`;

    document.getElementById('career-matches-count').textContent = m.matches;
    document.getElementById('career-wins-count').textContent = m.wins;
    const winPct = m.matches > 0 ? Math.round((m.wins / m.matches) * 100) : 0;
    document.getElementById('career-win-pct').textContent = `${winPct}%`;
    document.getElementById('career-trophies-count').textContent = m.trophies;
  },

  // ============================================================================
  // FLUXO DE ONBOARDING & NOVO JOGO
  // ============================================================================
  openOnboarding(step) {
    document.querySelectorAll('.onboard-step').forEach(s => s.style.display = 'none');
    this.openModal('modal-onboarding');

    // Botão Continuar Carreira aparece se houver save existente
    const btnContinue = document.getElementById('onboard-btn-continue');
    if (btnContinue) {
      btnContinue.style.display = StorageManager.hasSave() ? 'block' : 'none';
    }

    if (step === 'welcome') {
      document.getElementById('onboard-step-welcome').style.display = 'block';
    } else if (step === 'choose_club') {
      document.getElementById('onboard-step-choose').style.display = 'block';
      this.renderChooseClubsList();
    } else if (step === 'create_club') {
      document.getElementById('onboard-step-create').style.display = 'block';
      this.initCreateClubDraft();
    } else if (step === 'difficulty') {
      document.getElementById('onboard-step-difficulty').style.display = 'block';
    } else if (step === 'career_start') {
      document.getElementById('onboard-step-start').style.display = 'block';
      this.renderCareerStartSummary();
    }
  },

  // Renderiza lista de clubes disponíveis para escolha
  renderChooseClubsList() {
    const container = document.getElementById('choose-clubs-grid');
    if (!container) return;

    container.innerHTML = '';
    const division = Camisa11Data.DEFAULT_LEAGUES.div3;

    division.clubs.forEach(c => {
      const card = document.createElement('div');
      card.className = 'choose-club-card';
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          ${ClubManager.renderBadge(c, 48)}
          <div>
            <div style="font-weight: 800; font-size: 1.1rem;">${c.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.city} · ${c.country} · 🏟️ ${c.stadium}</div>
          </div>
        </div>
        <div style="display: flex; gap: 12px; margin-top: 12px; font-size: 0.88rem;">
          <span style="color: var(--gold); font-weight: 700;">⭐ ${c.ovr} OVR</span>
          <span style="color: var(--accent); font-weight: 700;">💰 R$ ${(c.budget / 1000000)}M</span>
          <span style="color: var(--blue); font-weight: 700;">🏆 ${c.titles} títulos</span>
        </div>
      `;
      card.addEventListener('click', () => {
        this.selectedExistingClub = c;
        this.openOnboarding('difficulty');
      });
      container.appendChild(card);
    });
  },

  // Inicializa rascunho de criação de clube próprio
  initCreateClubDraft() {
    this.createdClubDraft = {
      name: 'CAMISA11 FC',
      shortName: 'C11',
      city: 'São Paulo',
      country: 'Brasil',
      primaryColor: '#0f172a',
      secondaryColor: '#10b981',
      badgeShape: 'shield',
      badgeSymbol: 'ball',
      budget: 8000000,
      ovr: 72,
      titles: 2,
      stadium: 'Estádio da Colina',
      stadiumCapacity: 12000
    };
    this.updateCreateClubPreview();
  },

  updateCreateClubPreview() {
    if (!this.createdClubDraft) return;

    const nameInput = document.getElementById('create-club-name');
    const shortInput = document.getElementById('create-club-short');
    const cityInput = document.getElementById('create-club-city');

    if (nameInput && nameInput.value) this.createdClubDraft.name = nameInput.value;
    if (shortInput && shortInput.value) this.createdClubDraft.shortName = shortInput.value;
    if (cityInput && cityInput.value) this.createdClubDraft.city = cityInput.value;

    const previewContainer = document.getElementById('create-badge-preview');
    if (previewContainer) {
      previewContainer.innerHTML = ClubManager.renderBadge(this.createdClubDraft, 72);
    }
  },

  setCreateBadgeShape(shape) {
    if (!this.createdClubDraft) return;
    this.createdClubDraft.badgeShape = shape;
    this.updateCreateClubPreview();
  },

  setCreateBadgeSymbol(symbol) {
    if (!this.createdClubDraft) return;
    this.createdClubDraft.badgeSymbol = symbol;
    this.updateCreateClubPreview();
  },

  setCreateColor(type, color) {
    if (!this.createdClubDraft) return;
    if (type === 'primary') this.createdClubDraft.primaryColor = color;
    else this.createdClubDraft.secondaryColor = color;
    this.updateCreateClubPreview();
  },

  submitCreatedClub() {
    this.updateCreateClubPreview();
    this.selectedExistingClub = null;
    this.openOnboarding('difficulty');
  },

  // Escolha da Dificuldade
  selectDifficulty(diffId) {
    this.selectedDifficulty = diffId;
    this.openOnboarding('career_start');
  },

  // Tela de Confirmação e Início da Temporada
  renderCareerStartSummary() {
    const diff = Camisa11Data.DIFFICULTIES[this.selectedDifficulty] || Camisa11Data.DIFFICULTIES.normal;
    let baseClub = this.selectedExistingClub ? { ...this.selectedExistingClub } : { ...this.createdClubDraft };

    // Aplica bônus/penalidades de dificuldade
    baseClub.budget = Math.max(2000000, baseClub.budget + diff.budgetBonus);
    baseClub.ovr = Math.max(58, Math.min(88, baseClub.ovr + diff.ovrBonus));

    document.getElementById('start-summary-badge').innerHTML = ClubManager.renderBadge(baseClub, 64);
    document.getElementById('start-summary-club-name').textContent = baseClub.name;
    document.getElementById('start-summary-div').textContent = '3ª Divisão';
    document.getElementById('start-summary-budget').textContent = `R$ ${baseClub.budget.toLocaleString('pt-BR')}`;
    document.getElementById('start-summary-ovr').textContent = `${baseClub.ovr} OVR`;
    document.getElementById('start-summary-objective').textContent = `"${diff.objective}"`;
  },

  // Inicia a Carreira Oficialmente
  launchCareer() {
    const diff = Camisa11Data.DIFFICULTIES[this.selectedDifficulty] || Camisa11Data.DIFFICULTIES.normal;
    let club = this.selectedExistingClub ? { ...this.selectedExistingClub } : { ...this.createdClubDraft };

    club.budget = Math.max(2000000, club.budget + diff.budgetBonus);
    club.ovr = Math.max(58, Math.min(88, club.ovr + diff.ovrBonus));

    // Gera elenco inicial
    const squad = ClubManager.generateInitialSquad(club.ovr);

    // Carrega os 10 clubes da 3ª divisão
    const divisionClubs = Camisa11Data.DEFAULT_LEAGUES.div3.clubs.map(c => ({ ...c }));

    // Se o clube do usuário for customizado ou substituir um existente:
    const existingIdx = divisionClubs.findIndex(c => c.id === club.id);
    if (existingIdx !== -1) {
      divisionClubs[existingIdx] = club;
    } else {
      divisionClubs[0] = club;
    }

    // Inicializa o campeonato
    SeasonManager.initSeason(divisionClubs, club.id, 2026);

    this.state = {
      firstRunComplete: true,
      club,
      squad,
      seasonClubs: divisionClubs,
      manager: {
        name: 'Treinador',
        reputation: 42,
        matches: 0,
        wins: 0,
        trophies: club.titles || 0,
        history: []
      },
      difficulty: this.selectedDifficulty,
      season: {
        year: 2026,
        division: '3ª Divisão',
        round: 1,
        objective: diff.objective
      },
      lastMatchResult: null,
      tactics: {
        formation: '4-3-3',
        mentality: 'EQUILIBRADA',
        pressing: 'NORMAL'
      }
    };

    TacticsManager.currentFormation = '4-3-3';
    TacticsManager.mentality = 'EQUILIBRADA';
    TacticsManager.pressing = 'NORMAL';

    this.saveCurrentGame();
    this.onGameReady();
    this.showToast('Temporada 2026 Iniciada com Sucesso!');
  },

  // Modal de Detalhes do Jogador
  openPlayerModal(player) {
    this.inspectingPlayer = player;
    document.getElementById('modal-player-name').textContent = player.name;
    document.getElementById('modal-player-pos-age').textContent = `${player.pos} · ${player.age} anos · Potencial: ${player.potential}`;
    document.getElementById('modal-player-ovr').textContent = `${player.ovr} OVR`;
    document.getElementById('modal-player-value').textContent = `R$ ${player.value.toLocaleString('pt-BR')}`;
    document.getElementById('modal-player-status').textContent = player.isStarter ? 'Titular' : 'Reserva';

    // Atributos detalhados
    if (player.stats) {
      document.getElementById('stat-pace').textContent = player.stats.pace;
      document.getElementById('stat-shoot').textContent = player.stats.shooting;
      document.getElementById('stat-pass').textContent = player.stats.passing;
      document.getElementById('stat-dribble').textContent = player.stats.dribbling;
      document.getElementById('stat-defend').textContent = player.stats.defending;
      document.getElementById('stat-physical').textContent = player.stats.physical;
    }

    this.openModal('modal-player');
  },

  // Vender jogador inspecionado
  sellInspectedPlayer() {
    if (!this.inspectingPlayer) return;
    const res = TransferMarket.sellPlayer(this.inspectingPlayer.id, this.state.club, this.state.squad);
    if (res.success) {
      SoundEngine.playKick(false);
      this.closeModal('modal-player');
      this.renderSquad();
      this.updateHeader();
      this.saveCurrentGame();
      this.showToast(res.message);
    } else {
      this.showToast(res.message);
    }
  },

  // Helper de cores de OVR
  getOvrColorClass(ovr) {
    if (ovr >= 75) return 'ovr-high';
    if (ovr >= 68) return 'ovr-med';
    return 'ovr-low';
  },

  // Modais genéricos
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  },

  // Notificações Toast
  showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  // Configuração dos Event Listeners globais e atalhos de teclado
  setupEventListeners() {
    // Teclado: ESC (Pausa), SPACE (Continuar), M (Mentalidade)
    window.addEventListener('keydown', (e) => {
      if (MatchSimulator.currentMatch && !MatchSimulator.isPaused && e.code === 'Escape') {
        MatchSimulator.togglePause();
        this.showToast('Partida Pausada');
      } else if (MatchSimulator.currentMatch && MatchSimulator.isPaused && e.code === 'Space') {
        MatchSimulator.togglePause();
        this.showToast('Partida Retomada');
      } else if (e.code === 'KeyM') {
        const next = TacticsManager.mentality === 'DEFENSIVA' ? 'EQUILIBRADA' : TacticsManager.mentality === 'EQUILIBRADA' ? 'OFENSIVA' : 'DEFENSIVA';
        TacticsManager.setMentality(next);
        this.showToast(`Mentalidade: ${next}`);
      }
    });

    // Alternar som
    const btnSound = document.getElementById('btn-sound-toggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const enabled = SoundEngine.toggleSound();
        btnSound.textContent = enabled ? '🔊 Som' : '🔇 Mudo';
        this.showToast(enabled ? 'Sons ativados!' : 'Sons silenciados.');
      });
    }

    // Botão reset / recomeçar
    const btnReset = document.getElementById('btn-reset-career');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja reiniciar sua carreira? Todo o progresso salvo será apagado.')) {
          StorageManager.clearSave();
          location.reload();
        }
      });
    }
  }
};

// Inicializa o jogo ao carregar o DOM
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
