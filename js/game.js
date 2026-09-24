/**
 * CAMISA11 — Football Tycoon
 * game.js — Motor Central de Estado, Economia, Áudio Sintetizado, Eventos e Temporadas
 */

// Sintetizador Nativo de Áudio usando Web Audio API (Zero dependências externas!)
const AudioSynth = {
  ctx: null,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  getSettings() {
    return window.StorageManager?.loadSettings() || { soundEnabled: true, soundVolume: 0.7 };
  },

  // Apito de juiz de futebol
  playWhistle() {
    const s = this.getSettings();
    if (!s.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, now);
      osc.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(2800, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25 * s.soundVolume, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn('AudioSynth whistle error:', e);
    }
  },

  // Celebração de Gol (Torcida em festa + corneta de estádio)
  playGoal() {
    const s = this.getSettings();
    if (!s.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const now = this.ctx.currentTime;

      // Ruído branco filtrado (som da arquibancada vibrando!)
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(1400, now + 0.8);
      filter.frequency.linearRampToValueAtTime(600, now + 1.5);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.35 * s.soundVolume, now + 0.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 1.5);

      // Corneta aguda de estádio
      const horn = this.ctx.createOscillator();
      const hornGain = this.ctx.createGain();
      horn.type = 'sawtooth';
      horn.frequency.setValueAtTime(440, now);
      horn.frequency.linearRampToValueAtTime(587, now + 0.3);

      hornGain.gain.setValueAtTime(0.001, now);
      hornGain.gain.linearRampToValueAtTime(0.18 * s.soundVolume, now + 0.05);
      hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      horn.connect(hornGain);
      hornGain.connect(this.ctx.destination);

      horn.start(now);
      horn.stop(now + 0.7);
    } catch (e) {
      console.warn('AudioSynth goal error:', e);
    }
  },

  // Caixa registradora / Moedas ("Cha-ching!")
  playCoin() {
    const s = this.getSettings();
    if (!s.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      const freqs = [1200, 1600, 2400];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + (idx * 0.06);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.2 * s.soundVolume, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (e) {
      console.warn('AudioSynth coin error:', e);
    }
  },

  // Fanfarra de vitória / Conquista épica
  playFanfare() {
    const s = this.getSettings();
    if (!s.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      // Tríade maior triunfal (Dó, Mi, Sol, Dó agudo)
      const notes = [
        { f: 523.25, d: 0.12, pause: 0.0 },
        { f: 659.25, d: 0.12, pause: 0.14 },
        { f: 783.99, d: 0.16, pause: 0.28 },
        { f: 1046.50, d: 0.5,  pause: 0.46 }
      ];

      notes.forEach(n => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + n.pause;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.22 * s.soundVolume, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + n.d);
      });
    } catch (e) {
      console.warn('AudioSynth fanfare error:', e);
    }
  },

  // Clique de interface
  playClick() {
    const s = this.getSettings();
    if (!s.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

      gain.gain.setValueAtTime(0.08 * s.soundVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Ignora erro de clique rápido
    }
  }
};

window.AudioSynth = AudioSynth;

// Estado Mestre do Jogo
const Game = {
  state: null,

  // Inicializa o jogo: tenta carregar do storage ou prepara para onboarding
  init() {
    const saved = window.StorageManager.loadGame();
    if (saved && saved.club) {
      this.state = saved;
      this.validateStateIntegrity();
    } else {
      this.state = null; // Requer onboarding
    }
  },

  // Cria um novo clube com as escolhas do jogador
  createNewClub(options) {
    const initialPlayers = window.PlayerDB.generateInitialSquad(56);

    this.state = {
      version: 1,
      createdAt: Date.now(),
      club: {
        name: options.name || 'Camisa 11 FC',
        nickname: options.nickname || 'O Onze Furacão',
        city: options.city || 'São Paulo, SP',
        primaryColor: options.primaryColor || '#00e676',
        secondaryColor: options.secondaryColor || '#111827',
        badge: options.badge || 'assets/images/camisa11-logo.jpg',
        level: 1,
        xp: 0,
        xpToNext: 100,
        reputation: 10,
        funds: 50000,
        fans: 1250,
        titlesCount: 0,
        trophies: [],
        recentForm: '🟢 1V',
        seasonNumber: 1,
        currentWeek: 1,
        currentCompetition: 'estadual',
        competitionRound: 1,
        competitionPoints: 0,
        winStreak: 0,
        totalGols: 0,
        totalMatches: 0
      },
      stadium: {
        capacity: 1000,
        ticketPricing: 'normal', // 'cheap' (R$ 20), 'normal' (R$ 45), 'vip' (R$ 90)
        facilities: {
          stands: 1,
          vip: 0,
          food: 1,
          store: 0,
          parking: 0,
          media: 0,
          lighting: 0,
          museum: 0
        }
      },
      training: {
        facilities: {
          gym: 1,
          pitch: 1,
          medical: 0,
          tech: 0,
          youth: 1
        }
      },
      squad: {
        players: initialPlayers
      },
      rivalry: {
        rivalName: options.rivalName || 'Rival FC',
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
      },
      sponsorship: {
        active: {
          name: 'Energia Tropical',
          weeklyPayout: 18000,
          weeksLeft: 12,
          perMatchBonus: 5000
        },
        offers: [
          { id: 'sp_1', name: 'Banco Futuro', weeklyPayout: 32000, minRep: 18, duration: 16, perMatchBonus: 8000 },
          { id: 'sp_2', name: 'Cerveja Campeã', weeklyPayout: 65000, minRep: 35, duration: 20, perMatchBonus: 15000 },
          { id: 'sp_3', name: 'Fly Brasil Airlines', weeklyPayout: 180000, minRep: 60, duration: 24, perMatchBonus: 40000 },
          { id: 'sp_4', name: 'Global Tech Motors', weeklyPayout: 450000, minRep: 82, duration: 30, perMatchBonus: 100000 }
        ]
      },
      cards: {
        inventory: [
          { id: 'c_craque_1', name: 'Craque da Rodada', desc: '+10 OVR ofensivo nas próximas 2 partidas', icon: '⚡', rarity: 'rara', type: 'craque', duration: 2 },
          { id: 'c_cheia_1', name: 'Casa Cheia', desc: '100% de ocupação garantida no próximo jogo', icon: '🏟️', rarity: 'epica', type: 'casa_cheia', duration: 1 }
        ],
        activeBoosts: []
      },
      marketing: {
        campaigns: [
          { id: 'mkt_social', name: 'Viral nas Redes Sociais', cost: 12000, fanYield: 850, repYield: 1, cooldownWeeks: 0 },
          { id: 'mkt_tv', name: 'Campanha Nacional de TV', cost: 75000, fanYield: 7500, repYield: 4, cooldownWeeks: 0 },
          { id: 'mkt_world', name: 'Turnê de Pré-Temporada Global', cost: 400000, fanYield: 45000, repYield: 12, cooldownWeeks: 0 }
        ]
      },
      missions: {
        daily: window.MissionsDB.generateDailyMissions(),
        unlockedAchievements: []
      },
      rankingHistory: [130]
    };

    window.StorageManager.saveGame(this.state);
    return this.state;
  },

  // Valida integridade do savegame e preenche campos novos se houver atualizações
  validateStateIntegrity() {
    if (!this.state.missions || !this.state.missions.daily) {
      this.state.missions = {
        daily: window.MissionsDB.generateDailyMissions(),
        unlockedAchievements: []
      };
    }
    if (!this.state.rankingHistory) {
      this.state.rankingHistory = [120];
    }
    if (!this.state.cards) {
      this.state.cards = { inventory: [], activeBoosts: [] };
    }
  },

  // Retorna o valor de patrimônio total do clube (Club Net Worth)
  calculateClubNetWorth() {
    if (!this.state) return 0;
    const funds = this.state.club.funds || 0;

    // Valor do elenco somado
    const squadValue = (this.state.squad?.players || []).reduce((acc, p) => acc + (p.marketValue || 0), 0);

    // Valor do estádio e instalações
    const stadiumTier = window.StadiumDB.capacityTiers.find(t => t.capacity === this.state.stadium.capacity) || { cost: 50000 };
    let stadiumValue = stadiumTier.cost + 500000;
    Object.keys(this.state.stadium.facilities).forEach(facId => {
      const lvl = this.state.stadium.facilities[facId] || 0;
      const def = window.StadiumDB.facilities[facId];
      if (def && lvl > 0) {
        stadiumValue += def.baseCost * lvl * 1.5;
      }
    });

    return Math.round(funds + squadValue + stadiumValue);
  },

  // Adiciona XP ao clube e processa Level Up se necessário
  addClubXp(amount) {
    if (!this.state) return;
    this.state.club.xp += amount;

    while (this.state.club.xp >= this.state.club.xpToNext) {
      this.state.club.xp -= this.state.club.xpToNext;
      this.state.club.level += 1;
      this.state.club.xpToNext = Math.round(this.state.club.xpToNext * 1.25 + 50);

      // Recompensa por subir de nível
      const levelUpBonus = this.state.club.level * 25000;
      this.state.club.funds += levelUpBonus;
      this.state.club.reputation = Math.min(100, this.state.club.reputation + 2);

      // Notificação e som
      AudioSynth.playFanfare();
      if (window.App) {
        window.App.showNotification(
          `🎉 LEVEL UP! NÍVEL ${this.state.club.level}`,
          `Bônus de diretoria: +R$ ${levelUpBonus.toLocaleString('pt-BR')} e +2 Reputação!`
        );
      }
    }
  },

  // Verifica e concede conquistas desbloqueadas
  checkAchievements() {
    if (!this.state) return;
    const club = this.state.club;
    const stadium = this.state.stadium;
    const squad = this.state.squad;
    const netWorth = this.calculateClubNetWorth();

    window.MissionsDB.achievements.forEach(ach => {
      if (this.state.missions.unlockedAchievements.includes(ach.id)) return;

      let unlocked = false;
      if (ach.id === 'first_win' && club.totalMatches > 0 && club.winStreak > 0) unlocked = true;
      if (ach.id === 'first_trophy' && club.titlesCount >= 1) unlocked = true;
      if (ach.id === 'stadium_5k' && stadium.capacity >= 5000) unlocked = true;
      if (ach.id === 'stadium_25k' && stadium.capacity >= 25000) unlocked = true;
      if (ach.id === 'stadium_80k' && stadium.capacity >= 80000) unlocked = true;
      if (ach.id === 'fans_10k' && club.fans >= 10000) unlocked = true;
      if (ach.id === 'fans_100k' && club.fans >= 100000) unlocked = true;
      if (ach.id === 'fans_1m' && club.fans >= 1000000) unlocked = true;
      if (ach.id === 'money_1m' && club.funds >= 1000000) unlocked = true;
      if (ach.id === 'money_50m' && netWorth >= 50000000) unlocked = true;
      if (ach.id === 'derby_winner' && this.state.rivalry.wins >= 1) unlocked = true;
      if (ach.id === 'derby_dominant' && this.state.rivalry.wins >= 5) unlocked = true;
      if (ach.id === 'streak_5' && club.winStreak >= 5) unlocked = true;
      if (ach.id === 'century_goals' && club.totalGols >= 100) unlocked = true;
      if (ach.id === 'top_30') {
        const userRank = window.RankingSystem.getUserRank({ ...club, funds: club.funds, squadValue: 0, stadiumValue: 0 });
        if (userRank <= 30) unlocked = true;
      }
      if (ach.id === 'top_1') {
        const userRank = window.RankingSystem.getUserRank({ ...club, funds: club.funds, squadValue: 0, stadiumValue: 0 });
        if (userRank === 1) unlocked = true;
      }

      if (unlocked) {
        this.state.missions.unlockedAchievements.push(ach.id);
        club.funds += ach.cashReward;
        this.addClubXp(ach.xpReward);
        AudioSynth.playFanfare();
        if (window.App) {
          window.App.showNotification(
            `🏆 CONQUISTA DESBLOQUEADA: ${ach.title}`,
            `+R$ ${ach.cashReward.toLocaleString('pt-BR')} e +${ach.xpReward} XP!`
          );
        }
      }
    });
  },

  // Dispara uma carta de boost
  useBoostCard(cardIndex) {
    if (!this.state || !this.state.cards.inventory[cardIndex]) return;
    const card = this.state.cards.inventory[cardIndex];

    if (card.type === 'recuperacao') {
      // Restaura 100% de energia e moral
      this.state.squad.players.forEach(p => {
        p.energy = 100;
        p.morale = 100;
      });
      AudioSynth.playCoin();
      if (window.App) window.App.showNotification('✨ RECUPERAÇÃO COMPLETA!', 'Todo o elenco está com 100% de energia e moral renovada.');
    } else {
      // Adiciona aos boosts ativos para as próximas partidas
      this.state.cards.activeBoosts.push({
        ...card,
        remainingMatches: card.duration || 2
      });
      AudioSynth.playCoin();
      if (window.App) window.App.showNotification(`⚡ BÔNUS ATIVADO: ${card.name}`, card.desc);
    }

    // Remove do inventário
    this.state.cards.inventory.splice(cardIndex, 1);
    window.StorageManager.saveGame(this.state);
  },

  // Avança a semana no calendário (salários, finanças semanais e restauração do elenco)
  advanceWeek() {
    if (!this.state) return;

    this.state.club.currentWeek += 1;

    // Folha salarial semanal dos atletas
    const totalWeeklyWages = (this.state.squad.players || []).reduce((acc, p) => acc + (p.salary || 1000), 0);
    this.state.club.funds -= totalWeeklyWages;

    // Receita de patrocínio semanal
    if (this.state.sponsorship.active && this.state.sponsorship.active.weeksLeft > 0) {
      const spPay = this.state.sponsorship.active.weeklyPayout;
      this.state.club.funds += spPay;
      this.state.sponsorship.active.weeksLeft -= 1;
    }

    // Receita da loja oficial diária/semanal baseada no tamanho da torcida
    const storeLevel = this.state.stadium.facilities.store || 0;
    const passiveMerchandise = Math.round((this.state.club.fans * 0.08) * (15 + storeLevel * 8));
    this.state.club.funds += passiveMerchandise;

    // Recuperação de fadiga pelo centro de treinamento
    const ctGymLevel = this.state.training.facilities.gym || 1;
    this.state.squad.players.forEach(p => {
      p.energy = Math.min(100, p.energy + (18 + ctGymLevel * 4));
      // Envelhecimento progressivo leve
      if (this.state.club.currentWeek % 38 === 0) {
        p.age += 1;
        window.PlayerDB.updatePlayerValuation(p);
      }
    });

    // Se completou 38 rodadas (1 temporada)
    if (this.state.club.currentWeek > 38) {
      this.state.club.seasonNumber += 1;
      this.state.club.currentWeek = 1;
      this.state.club.competitionRound = 1;
      this.state.club.competitionPoints = 0;
      this.state.club.funds += 1000000; // Bônus de fim de temporada
      if (window.App) {
        window.App.showNotification(
          `🎊 NOVA TEMPORADA: ANO ${this.state.club.seasonNumber}`,
          'Parabéns pela temporada concluída! Bônus de R$ 1.000.000 concedido aos cofres do clube.'
        );
      }
    }

    // Grava histórico de ranking
    const currentRank = window.RankingSystem.getUserRank({
      ...this.state.club,
      funds: this.state.club.funds,
      squadValue: 0,
      stadiumValue: 0
    });
    this.state.rankingHistory.unshift(currentRank);
    if (this.state.rankingHistory.length > 8) this.state.rankingHistory.pop();

    this.checkAchievements();
    window.StorageManager.saveGame(this.state);
  },

  // Chance de gerar evento aleatório dinâmico
  checkRandomEvent() {
    if (Math.random() > 0.4) return null; // 40% de chance pós-partida

    const events = [
      {
        id: 'ev_arabia',
        title: '🇸🇦 Proposta Milionária da Arábia!',
        desc: 'Um emissário do futebol árabe se encantou com as atuações do clube e oferece R$ 800.000 de investimento imediato em troca de um amistoso internacional.',
        optionA: { label: 'Aceitar Acordo (+R$ 800.000)', effect: () => { Game.state.club.funds += 800000; AudioSynth.playCoin(); } },
        optionB: { label: 'Recusar para focar nas finais (+5 Moral)', effect: () => { Game.state.squad.players.forEach(p => p.morale = 100); } }
      },
      {
        id: 'ev_tiktok',
        title: '📱 Febre no TikTok!',
        desc: 'Um lance de habilidade do seu jovem atacante viralizou e acumulou 15 milhões de visualizações!',
        optionA: { label: 'Lançar Edição Especial de Camisas (+R$ 250.000)', effect: () => { Game.state.club.funds += 250000; AudioSynth.playCoin(); } },
        optionB: { label: 'Fazer campanha para novos sócios (+3.500 Torcedores)', effect: () => { Game.state.club.fans += 3500; } }
      },
      {
        id: 'ev_investor',
        title: '🤝 Investidor de Risco',
        desc: 'Um empresário local deseja patrocinar a reforma do gramado do estádio se você garantir um camarote no próximo clássico.',
        optionA: { label: 'Aceitar Parceria (+1 Nível de Gramado)', effect: () => { Game.state.training.facilities.pitch = Math.min(8, (Game.state.training.facilities.pitch || 1) + 1); } },
        optionB: { label: 'Manter camarote para a torcida (+3 Reputação)', effect: () => { Game.state.club.reputation = Math.min(100, Game.state.club.reputation + 3); } }
      }
    ];

    return events[Math.floor(Math.random() * events.length)];
  }
};

window.Game = Game;
