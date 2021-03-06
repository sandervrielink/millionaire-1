const expect = require('chai').expect;
const should = require('chai').should();

const Choices = require(process.cwd() + '/server/question/Choices.js');
const FastestFingerQuestion = require(process.cwd() + '/server/question/FastestFingerQuestion.js');
const GameServer = require(process.cwd() + '/server/game/GameServer.js');
const HotSeatQuestion = require(process.cwd() + '/server/question/HotSeatQuestion.js');
const LocalizedStrings = require(process.cwd() + '/localization/LocalizedStrings.js');
const MockSocket = require(process.cwd() + '/server/socket/MockSocket.js');
const Player = require(process.cwd() + '/server/game/Player.js');
const PlayerMap = require(process.cwd() + '/server/game/PlayerMap.js');
const ServerState = require(process.cwd() + '/server/game/ServerState.js');

const MONEY_STRINGS = require(process.cwd() + '/server/question/MoneyTree.js').MONEY_STRINGS;

function newGameServerWithPlayerShowHost(present) {
  var gameServer = new GameServer(new PlayerMap());
  gameServer.serverState = new ServerState(gameServer.playerMap);
  gameServer.serverState.playerShowHostPresent = () => { return present; };
  return gameServer;
}

function newGameServerWithHotSeatQuestion(showHostPresent) {
  var gameServer = newGameServerWithPlayerShowHost(showHostPresent);
  gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
    text: 'text',
    orderedChoices: ['1', '2', '3', '4']
  }, /*questionIndex=*/0, gameServer.playerMap);
  return gameServer;
}

describe('GameServerTest', () => {
  describe('activateListenersForSocket', function () {
    it('shouldGiveExpectedResult', () => {
      var gameServer = new GameServer(new PlayerMap());
      var socket = new MockSocket('socket_id');
      var player = new Player(socket, 'username');
      gameServer.playerMap.putPlayer(player);

      gameServer.activateListenersForSocket(socket);

      expect(Object.keys(socket.listeners)).to.deep.equal(GameServer.SOCKET_EVENTS);
    });
  });

  it('deactivateListenersForSocketShouldGiveExpectedResult', () => {
    var gameServer = new GameServer(new PlayerMap());
    var socket = new MockSocket('socket_id');
    var player = new Player(socket, 'username');
    gameServer.playerMap.putPlayer(player);
    gameServer.activateListenersForSocket(socket);

    gameServer.deactivateListenersForSocket(socket);

    expect(Object.keys(socket.listeners)).to.be.empty;
  });

  describe('endGame', function () {
    it('shouldGiveExpectedResult', () => {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.endGame();

      expect(gameServer.serverState).to.be.undefined;
    });
  });

  describe('gameOptionsAreValid', function () {
    it('shouldAllowNoShowHost', () => {
      var gameServer = new GameServer(new PlayerMap());
      var gameOptions = { showHostUsername: undefined };

      var result = gameServer.gameOptionsAreValid(gameOptions);

      expect(result).to.be.true;
    });

    it('shouldNotAllowShowHostForOnePlayer', () => {
      var gameServer = new GameServer(new PlayerMap());
      gameServer.playerMap.putPlayer(new Player(new MockSocket('socket_id'), 'username'));
      var gameOptions = { showHostUsername: 'username' };

      var result = gameServer.gameOptionsAreValid(gameOptions);

      expect(result).to.be.false;
    });

    it('shouldAllowShowHostForMoreThanOnePlayer', () => {
      var gameServer = new GameServer(new PlayerMap());
      gameServer.playerMap.putPlayer(new Player(new MockSocket('socket_id'), 'username'));
      gameServer.playerMap.putPlayer(new Player(new MockSocket('socket_id_2'), 'username_2'));
      var gameOptions = { showHostUsername: 'username' };

      var result = gameServer.gameOptionsAreValid(gameOptions);

      expect(result).to.be.true;
    });
  });

  describe('playMusic', function () {
    it('shouldSetExpectedAudioCommand', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var musicSrc = 'music';

      gameServer.playMusic(musicSrc, /*volume=*/1.0, /*loop=*/true);

      gameServer.serverState.audioCommand.should.deep.equal({
        musicSrc: musicSrc,
        loop: true,
        volume: 1.0
      });
    });

    it('shouldNotDoAnythingWhenNoLongerInGame', function () {
      var gameServer = new GameServer();

      gameServer.playMusic('musicSrc');
    });
  });

  describe('playSoundEffect', function () {
    it('shouldSetExpectedAudioCommand', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var fxSrc = 'sound';

      gameServer.playSoundEffect(fxSrc, /*volume=*/1.0, /*stopPreviousSounds=*/true);

      gameServer.serverState.audioCommand.should.deep.equal({
        fxSrc: fxSrc,
        stopPreviousSounds: true,
        volume: 1.0
      });
    });

    it('shouldNotDoAnythingWhenNoLongerInGame', function () {
      var gameServer = new GameServer();

      gameServer.playSoundEffect('fxSrc');
    });
  });

  describe('startGame', function () {
    it('shouldShowFastestFingerRulesForMultiplePlayers', () => {
      var gameServer = newGameServerWithPlayerShowHost(false);
      gameServer.playerMap.putPlayer(new Player(new MockSocket('socket1'), 'player1'));
      gameServer.playerMap.putPlayer(new Player(new MockSocket('socket1'), 'player2'));
      var showHostShowFastestFingerRulesCalled = false;
      gameServer.showHostShowFastestFingerRules = (data) => {
        showHostShowFastestFingerRulesCalled = true;
      };

      gameServer.startGame(/*gameOptions=*/{});

      gameServer.serverState.should.not.be.undefined;
      showHostShowFastestFingerRulesCalled.should.be.true;
    });

    it('shouldCueHotSeatRulesForSinglePlayer', () => {
      var gameServer = newGameServerWithPlayerShowHost(false);
      gameServer.playerMap.putPlayer(new Player(new MockSocket('socket1'), 'player1'));
      var showHostCueHotSeatRulesCalled = false;
      gameServer.showHostCueHotSeatRules = (data) => {
        showHostCueHotSeatRulesCalled = true;
      };

      gameServer.startGame(/*gameOptions=*/{});

      gameServer.serverState.should.not.be.undefined;
      showHostCueHotSeatRulesCalled.should.be.true;
    });
  });

  describe('showHostShowFastestFingerRules', function () {
    it('shouldShowCorrectDialogForHumanShowHost', () => {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostShowFastestFingerRules(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostCueFastestFingerQuestion',
          text: LocalizedStrings.CUE_FASTEST_FINGER_MUSIC
        }],
        header: ''
      });
      expect(gameServer.serverState.showHostStepDialog.timeout).to.be.undefined;
    });

    it('shouldSetTimerForNoShowHost', () => {
      var gameServer = newGameServerWithPlayerShowHost(false);

      gameServer.showHostShowFastestFingerRules(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [],
        header: ''
      });
      expect(gameServer.serverState.showHostStepDialog.timeout).to.not.be.undefined;
      gameServer.serverState.showHostStepDialog.clearTimeout();
    });

    it('shouldSetExpectedInfoTexts', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.showHostShowFastestFingerRules(new MockSocket(), /*data=*/{});

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.SHOW_HOST_FASTEST_FINGER_RULES);
      expect(gameServer.serverState.hotSeatInfoText).to.be.undefined;
      gameServer.serverState.contestantInfoText.should.equal(
        LocalizedStrings.CONTESTANT_FASTEST_FINGER_RULES);
    });
  });

  describe('showHostCueFastestFingerQuestion', function () {
    it('shouldShowCorrectDialogForHumanShowHost', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostCueFastestFingerQuestion(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostShowFastestFingerQuestionText',
          text: LocalizedStrings.SHOW_FASTEST_FINGER_QUESTION
        }],
        header: ''
      });
      expect(gameServer.serverState.showHostStepDialog.timeout).to.be.undefined;
    });

    it('shouldSetTimerForNoShowHost', function () {
      var gameServer = newGameServerWithPlayerShowHost(false);

      gameServer.showHostCueFastestFingerQuestion(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [],
        header: ''
      });
      expect(gameServer.serverState.showHostStepDialog.timeout).to.not.be.undefined;
      gameServer.serverState.showHostStepDialog.clearTimeout();
    });

    it('shouldStartNewRound', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var newRoundStarted = false;
      gameServer.serverState.startNewRound = () => { newRoundStarted = true; };

      gameServer.showHostCueFastestFingerQuestion(new MockSocket(), /*data=*/{});

      newRoundStarted.should.be.true;
    });
  });

  it('showHostShowFastestFingerQuestionTextShouldShowCorrectDialogForHumanShowHost', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);

    gameServer.showHostShowFastestFingerQuestionText(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
      actions: [{
        socketEvent: 'showHostCueFastestFingerThreeStrikes',
        text: LocalizedStrings.REVEAL_FASTEST_FINGER_CHOICE
      }],
      header: ''
    });
    expect(gameServer.serverState.showHostStepDialog.timeout).to.be.undefined;
  });

  it('showHostShowFastestFingerQuestionTextShouldGenerateQuestion', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);
    var questionBefore, questionAfter;

    questionBefore = gameServer.serverState.fastestFingerQuestion;
    gameServer.showHostShowFastestFingerQuestionText(new MockSocket(), /*data=*/{});
    questionAfter = gameServer.serverState.fastestFingerQuestion;

    expect(questionBefore).to.be.undefined;
    expect(questionAfter).to.not.be.undefined;
  });

  it('showHostCueFastestFingerThreeStrikesShouldGiveExpectedResult', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);

    gameServer.showHostCueFastestFingerThreeStrikes(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
    expect(gameServer.currentForcedTimer._onTimeout).to.not.be.undefined;
    clearTimeout(gameServer.currentForcedTimer);
  });

  it('showHostRevealFastestFingerQuestionChoicesShouldGiveExpectedResult', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);
    gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
      text: 'questionText',
      orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
    });

    gameServer.showHostRevealFastestFingerQuestionChoices(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
    expect(gameServer.serverState.fastestFingerQuestion.revealedChoices).to.have.lengthOf(
      Choices.MAX_CHOICES);
  });

  it('showHostRevealFastestFingerQuestionChoicesShouldSetFastestFingerStartTime', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);
    gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
      text: 'questionText',
      orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
    });

    gameServer.showHostRevealFastestFingerQuestionChoices(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.fastestFingerQuestion.startTime).to.not.be.undefined;
    clearTimeout(gameServer.currentForcedTimer);
  });

  describe('contestantFastestFingerChoose', function () {
    it('shouldNotCompleteIfChoicesLeft', () => {
      var gameServer = newGameServerWithPlayerShowHost(false);
      gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      }, gameServer.playerMap);
      var socket = new MockSocket('socket_id');
      var player = new Player(socket, 'username');
      gameServer.playerMap.putPlayer(player);
      var fastestFingerTimeUpTriggered = false;
      gameServer.fastestFingerTimeUp = () => { fastestFingerTimeUpTriggered = true; };

      gameServer.contestantFastestFingerChoose(socket, /*data=*/{
        choice: Choices.A
      });

      expect(fastestFingerTimeUpTriggered).to.be.false;
    });

    it('shouldCompleteIfAllChoicesMade', () => {
      var gameServer = newGameServerWithPlayerShowHost(false);
      gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      }, gameServer.playerMap);
      var socket = new MockSocket('socket_id');
      var player = new Player(socket, 'username');
      player.fastestFingerChoices = [Choices.A, Choices.B, Choices.C];
      gameServer.playerMap.putPlayer(player);
      var fastestFingerTimeUpTriggered = false;
      gameServer.fastestFingerTimeUp = () => { fastestFingerTimeUpTriggered = true; };

      gameServer.contestantFastestFingerChoose(socket, /*data=*/{
        choice: Choices.D
      });

      expect(fastestFingerTimeUpTriggered).to.be.true;
      expect(gameServer.serverState.fastestFingerQuestion.allPlayersDone()).to.be.true;
    });
  });

  it('fastestFingerTimeUpShouldShowCorrectDialogForHumanShowHost', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);

    gameServer.fastestFingerTimeUp(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
      actions: [{
        socketEvent: 'showHostCueFastestFingerAnswerRevealAudio',
        text: LocalizedStrings.CUE_FASTEST_FINGER_ANSWER_REVEAL_AUDIO
      }],
      header: ''
    });
    expect(gameServer.serverState.showHostStepDialog.timeout).to.be.undefined;
  });

  it('fastestFingerTimeUpShouldSetTimerForNoShowHost', () => {
    var gameServer = newGameServerWithPlayerShowHost(false);

    gameServer.fastestFingerTimeUp(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
      actions: [],
      header: ''
    });
    expect(gameServer.serverState.showHostStepDialog.timeout).to.not.be.undefined;
    gameServer.serverState.showHostStepDialog.clearTimeout();
  });

  it('showHostRevealFastestFingerAnswerShouldRevealAnswer', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);
    gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
      text: 'questionText',
      orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
    });

    gameServer.showHostRevealFastestFingerAnswer(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.fastestFingerQuestion.revealedAnswers).to.have.lengthOf(1);
  });

  it('showHostRevealFastestFingerAnswerShouldSendSameDialogForAnswersLeft', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);
    gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
      text: 'questionText',
      orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
    });

    gameServer.showHostRevealFastestFingerAnswer(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
      actions: [{
        socketEvent: 'showHostRevealFastestFingerAnswer',
        text: LocalizedStrings.REVEAL_FASTEST_FINGER_ANSWER
      }],
      header: ''
    });
  });

  it('showHostRevealFastestFingerAnswerShouldSendNewDialogForNoAnswersLeft', () => {
    var gameServer = newGameServerWithPlayerShowHost(true);
    gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
      text: 'questionText',
      orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
    });
    gameServer.serverState.fastestFingerQuestion.shuffledChoices.forEach((choice, index) => {
      gameServer.serverState.fastestFingerQuestion.revealAnswer();
    });

    gameServer.showHostRevealFastestFingerAnswer(new MockSocket(), /*data=*/{});

    expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
      actions: [{
        socketEvent: 'showHostRevealFastestFingerResults',
        text: LocalizedStrings.REVEAL_FASTEST_FINGER_RESULTS
      }],
      header: ''
    });
  });

  describe('showHostRevealFastestFingerResults', function () {
    it('shouldSetExpectedDialog', () => {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });

      gameServer.showHostRevealFastestFingerResults(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostAcceptHotSeatPlayer',
          text: LocalizedStrings.ACCEPT_HOT_SEAT_PLAYER
        }],
        header: ''
      });
    });
  });

  describe('showHostAcceptHotSeatPlayer', function () {
    it('shouldSetExpectedCelebrationBanner', () => {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      }, gameServer.playerMap);
      gameServer.serverState.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.showHostAcceptHotSeatPlayer(mockSocket, /*data=*/{});

      expect(gameServer.serverState.celebrationBanner).to.deep.equal({
        header: LocalizedStrings.FASTEST_FINGER_WINNER,
        text: player.username
      });
    });

    it('shouldSetExpectedDialog', () => {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      }, gameServer.playerMap);
      gameServer.serverState.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);
      gameServer.showHostAcceptHotSeatPlayer(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostCueHotSeatRules',
          text: LocalizedStrings.SHOW_HOT_SEAT_RULES
        }],
        header: ''
      });
    });
  });

  describe('showHostCueHotSeatRules', function () {
    it('shouldStartNewRoundForSinglePlayer', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.isSinglePlayerGame = true;
      var startNewRoundCalled = false;
      gameServer.serverState.startNewRound = () => {
        startNewRoundCalled = true;
      };

      gameServer.showHostCueHotSeatRules();

      startNewRoundCalled.should.be.true;
    });

    it('shouldNotStartNewRoundForMultiplePlayers', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.isSinglePlayerGame = false;
      var startNewRoundCalled = false;
      gameServer.serverState.startNewRound = () => {
        startNewRoundCalled = true;
      };

      gameServer.showHostCueHotSeatRules();

      startNewRoundCalled.should.be.false;
    });


    it('shouldSetExpectedDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostCueHotSeatRules(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostCueHotSeatQuestion',
          text: LocalizedStrings.CUE_HOT_SEAT_QUESTION
        }],
        header: ''
      });
    });

    it('shouldResetFastestFingerQuestion', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.fastestFingerQuestion = new FastestFingerQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });

      gameServer.showHostCueHotSeatRules(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.fastestFingerQuestion).to.be.undefined;
    });

    it('shouldClearCelebrationBanner', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.celebrationBanner = {};

      gameServer.showHostCueHotSeatRules(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.celebrationBanner).to.be.undefined;
    });

    it('shouldSetExpectedInfoTexts', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.showHostCueHotSeatRules();

      gameServer.serverState.showHostInfoText.should.equal(LocalizedStrings.SHOW_HOST_RULES);
      gameServer.serverState.hotSeatInfoText.should.equal(LocalizedStrings.HOT_SEAT_RULES);
      gameServer.serverState.contestantInfoText.should.equal(LocalizedStrings.CONTESTANT_RULES);
    });
  });

  describe('showHostCueHotSeatQuestion', function () {
    it('shouldSetExpectedDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostCueHotSeatQuestion(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostShowHotSeatQuestionText',
          text: LocalizedStrings.SHOW_HOT_SEAT_QUESTION
        }],
        header: ''
      });
    });

    it('shouldClearCelebrationBanner', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.celebrationBanner = {};

      gameServer.showHostCueHotSeatQuestion(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.celebrationBanner).to.be.undefined;
    });

    it('shouldIncrementHotSeatQuestionIndex', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestionIndex = 0;

      gameServer.showHostCueHotSeatQuestion(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.hotSeatQuestionIndex).to.equal(1);
    });
  });

  describe('showHostShowHotSeatQuestionText', function () {
    it('shouldSetExpectedDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostShowHotSeatQuestionText(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.REVEAL_HOT_SEAT_CHOICE
        }],
        header: ''
      });
    });

    it('shouldSetHotSeatQuestion', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostShowHotSeatQuestionText(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.hotSeatQuestion).to.not.be.undefined;
    });
  });

  describe('showHostRevealHotSeatChoicehoice', function () {
    it('shouldRevealChoice', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      var player = new Player(new MockSocket(), 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.showHostRevealHotSeatChoice(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.hotSeatQuestion.revealedChoices).to.have.lengthOf(1);
    });

    it('shouldSetExpectedDialogWhenChoicesLeft', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      var player = new Player(new MockSocket(), 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.showHostRevealHotSeatChoice(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.REVEAL_HOT_SEAT_CHOICE
        }],
        header: ''
      });
    });

    it('shouldSetNoShowHostStepDialogWhenNoChoicesLeft', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      var player = new Player(new MockSocket(), 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);
      gameServer.serverState.hotSeatQuestion.revealAllChoices();

      gameServer.showHostRevealHotSeatChoice(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
    });

    it('shouldSetNoHotSeatStepDialogWhenNoChoicesLeft', function () {
      var gameServer = newGameServerWithPlayerShowHost(false);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      var player = new Player(new MockSocket(), 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);
      gameServer.serverState.hotSeatQuestion.revealAllChoices();
      gameServer.serverState.hotSeatStepDialog = {};

      gameServer.showHostRevealHotSeatChoice(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
    });
  });

  describe('hotSeatChoose', function () {
    it('shouldChooseHotSeatChoiceForPlayer', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.hotSeatChoose(mockSocket, { choice: Choices.A });

      expect(player.hotSeatChoice).to.equal(Choices.A);
    });

    it('shouldSetHostDialogWhenShowHostPresent', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.hotSeatChoose(mockSocket, { choice: Choices.A });

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'hotSeatFinalAnswer',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_FINAL_ANSWER
      });
      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
    });

    it('shouldHotSeatDialogWhenShowHostNotPresent', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/false);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.hotSeatChoose(mockSocket, { choice: Choices.A });

      expect(gameServer.serverState.hotSeatStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'hotSeatFinalAnswer',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_FINAL_ANSWER
      });
      expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
    });

    it('shouldSetHotSeatPlayerChoiceInGrader', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);

      gameServer.hotSeatChoose(mockSocket, { choice: Choices.A });

      gameServer.serverState.hotSeatQuestion.grader.hotSeatPlayerChoice.should.equal(Choices.A);
    });
  });

  describe('contestantChoose', function () {
    it('shouldChooseForGivenPlayer', () => {
      var gameServer = newGameServerWithPlayerShowHost(false);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.playerMap.putPlayer(player);

      gameServer.contestantChoose(mockSocket, { choice: Choices.A });

      expect(player.hotSeatChoice).to.equal(Choices.A);
    });

    it('shouldSetPhoneAFriendChoiceForFriend', function () {
      var gameServer = newGameServerWithPlayerShowHost(false);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.phoneAFriend.friend = player;

      gameServer.contestantChoose(mockSocket, { choice: Choices.A });

      player.hotSeatChoice.should.equal(gameServer.serverState.phoneAFriend.friendChoice);
    });

    it('shouldFinishAskTheAudienceIfNoLongerWaitingAndTimerIsOut', function () {
      var gameServer = newGameServerWithPlayerShowHost(false);
      var contestantSocket = new MockSocket('contestant');
      var contestant = new Player(contestantSocket, 'contestant');
      var finishAskTheAudienceCalled = false;
      gameServer.playerMap.putPlayer(contestant);
      gameServer.currentSocketEvent = 'showHostStartAskTheAudience';
      gameServer.serverState.askTheAudience.waitingForContestants = () => { return false; };
      gameServer.finishAskTheAudience = () => { finishAskTheAudienceCalled = true; };

      gameServer.contestantChoose(contestantSocket, { choice: Choices.A });

      finishAskTheAudienceCalled.should.be.true;
    });
  });

  describe('hotSeatFinalAnswer', function () {
    function getPreppedGameServer() {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      gameServer.serverState.hotSeatQuestion.shuffledChoices = [
        'choice 2', 'choice 1', 'choice 4', 'choice 3'
      ];
      var player = new Player(new MockSocket(), 'username');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername(player.username);
      gameServer.serverState.hotSeatQuestion.revealAllChoices();
      return gameServer;
    }

    it('shouldClearHotSeatStepDialog', function () {
      var gameServer = getPreppedGameServer();

      gameServer.hotSeatFinalAnswer(new MockSocket());

      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
    });

    it('shouldSetExpectedDialogForCorrectAnswer', function () {
      var gameServer = getPreppedGameServer();
      gameServer.serverState.hotSeatPlayer.chooseHotSeat(Choices.B);

      gameServer.hotSeatFinalAnswer(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostRevealHotSeatQuestionVictory',
          text: LocalizedStrings.HOT_SEAT_VICTORY
        }],
        header: ''
      });
    });

    it('shouldSetExpectedDialogForIncorrectAnswer', function () {
      var gameServer = getPreppedGameServer();
      gameServer.serverState.hotSeatPlayer.chooseHotSeat(Choices.A);

      gameServer.hotSeatFinalAnswer(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostRevealHotSeatQuestionLoss',
          text: LocalizedStrings.HOT_SEAT_LOSS
        }],
        header: ''
      });
    });
  });

  describe('showHostRevealHotSeatQuestionVictory', function () {
    it('shouldRevealCorrectChoiceForAll', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });

      gameServer.showHostRevealHotSeatQuestionVictory(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.hotSeatQuestion.correctChoiceRevealedForAll).to.be.true;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldGradeHotSeatQuestionForContestants', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      var questionsGraded = false;
      gameServer.serverState.hotSeatQuestion.grader.grade = () => {
        questionsGraded = true;
      };

      gameServer.showHostRevealHotSeatQuestionVictory(new MockSocket(), /*data=*/{});

      expect(questionsGraded).to.be.true;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('continuationShouldSetCelebrationBanner', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestionIndex = 0;

      gameServer.showHostRevealHotSeatQuestionVictory_Continuation();

      expect(gameServer.serverState.celebrationBanner).to.deep.equal({
        header: '',
        text: MONEY_STRINGS[gameServer.serverState.hotSeatQuestionIndex]
      });
    });

    it('continuationShouldResetHotSeatQuestion', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = {};

      gameServer.showHostRevealHotSeatQuestionVictory_Continuation();

      expect(gameServer.serverState.hotSeatQuestion).to.be.undefined;
    });

    it('continuationShouldSetExpectedDialogForGameStillGoing', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestionIndex = 0;

      gameServer.showHostRevealHotSeatQuestionVictory_Continuation();

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostCueHotSeatQuestion',
          text: LocalizedStrings.CUE_HOT_SEAT_QUESTION
        }],
        header: ''
      });
    });

    it('continuationShouldSetExpectedDialogForGameWon', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestionIndex = 14;

      gameServer.showHostRevealHotSeatQuestionVictory_Continuation();

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostSayGoodbyeToHotSeat',
          text: LocalizedStrings.SAY_GOODBYE
        }],
        header: ''
      });
    });
  });

  describe('showHostRevealHotSeatQuestionLoss', function () {
    it('shouldRevealCorrectChoiceForAll', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });

      gameServer.showHostRevealHotSeatQuestionLoss(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.hotSeatQuestion.correctChoiceRevealedForAll).to.be.true;
    });

    it('shouldGradeHotSeatQuestionForContestants', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      var questionsGraded = false;
      gameServer.serverState.hotSeatQuestion.grader.grade = () => {
        questionsGraded = true;
      };

      gameServer.showHostRevealHotSeatQuestionLoss(new MockSocket(), /*data=*/{});

      expect(questionsGraded).to.be.true;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldSetExpectedHotSeatQuestionIndex', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      gameServer.serverState.hotSeatQuestionIndex = 9;

      gameServer.showHostRevealHotSeatQuestionLoss(new MockSocket());

      expect(gameServer.serverState.hotSeatQuestionIndex).to.be.lt(9);
    });

    it('shouldSetExpectedDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });

      gameServer.showHostRevealHotSeatQuestionLoss(new MockSocket(), /*data=*/{});

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostSayGoodbyeToHotSeat',
          text: LocalizedStrings.SAY_GOODBYE
        }],
        header: ''
      });
    });
  });

  describe('showHostSayGoodbyeToHotSeat', function () {
    function getPreppedGameServer(hotSeatQuestionIndex = 0) {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      gameServer.serverState.hotSeatQuestionIndex = hotSeatQuestionIndex;
      var player = new Player(new MockSocket('socket_id'), 'username');
      gameServer.serverState.playerMap.putPlayer(player);
      gameServer.serverState.setHotSeatPlayerByUsername('username');
      gameServer.serverState.startNewRound = () => {};
      return gameServer;
    }

    it('shouldSetExpectedCelebrationBanner', function () {
      var hotSeatQuestionIndex = 0;
      var gameServer = getPreppedGameServer(hotSeatQuestionIndex);

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.celebrationBanner).to.deep.equal({
        header: LocalizedStrings.TOTAL_WINNINGS,
        text: MONEY_STRINGS[hotSeatQuestionIndex]
      });
    });

    it('shouldSetExpectedCelebrationBannerForLowTierExit', function () {
      var hotSeatQuestionIndex = -1;
      var gameServer = getPreppedGameServer(hotSeatQuestionIndex);

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.celebrationBanner).to.deep.equal({
        header: LocalizedStrings.TOTAL_WINNINGS,
        text: '$0'
      });
    });

    it('shouldGiveMoneyToHotSeatPlayer', function () {
      var hotSeatQuestionIndex = 4;
      var gameServer = getPreppedGameServer(hotSeatQuestionIndex);

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.hotSeatPlayer.money).to.equal(
        HotSeatQuestion.PAYOUTS[hotSeatQuestionIndex]);
    });

    it('shouldNotGiveMoneyToHotSeatPlayerOnLowTierExit', function () {
      var hotSeatQuestionIndex = -1;
      var gameServer = getPreppedGameServer(hotSeatQuestionIndex);

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.hotSeatPlayer.money).to.equal(0);
    });

    it('shouldResetHotSeatQuestion', function () {
      var gameServer = getPreppedGameServer();

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.hotSeatQuestion).to.be.undefined;
    });

    it('shouldSetExpectedDialogForMultiplePlayers', function () {
      var gameServer = getPreppedGameServer();
      gameServer.isSinglePlayerGame = false;

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostCueFastestFingerQuestion',
          text: LocalizedStrings.START_NEW_ROUND
        }],
        header: ''
      });
    });

    it('shouldSetExpectedDialogForSinglePlayer', function () {
      var gameServer = getPreppedGameServer();
      gameServer.isSinglePlayerGame = true;

      gameServer.showHostSayGoodbyeToHotSeat();

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'showHostCueHotSeatRules',
          text: LocalizedStrings.START_NEW_ROUND
        }],
        header: ''
      });
    });
  });

  describe('hotSeatWalkAway', function () {
    function getPreppedGameServerWithShowHostPresent(showHostPresent) {
      var gameServer = newGameServerWithPlayerShowHost(showHostPresent);
      var mockSocket = new MockSocket('socket_id');
      var player = new Player(mockSocket, 'player');
      gameServer.serverState.playerMap.putPlayer(player);
      if (showHostPresent) {
        gameServer.serverState.setShowHostByUsername(player.username);
      } else {
        gameServer.serverState.setHotSeatPlayerByUsername(player.username);
      }
      return gameServer;
    }

    it('shouldSetHostDialogWhenShowHostPresent', function () {
      var gameServer = getPreppedGameServerWithShowHostPresent(true);

      gameServer.hotSeatWalkAway(new MockSocket());

      expect(gameServer.serverState.showHostStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'hotSeatConfirmWalkAway',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_CONFIRM_WALK_AWAY
      });
      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
    });

    it('shouldHotSeatDialogWhenShowHostNotPresent', function () {
      var gameServer = getPreppedGameServerWithShowHostPresent(false);

      gameServer.hotSeatWalkAway(new MockSocket());

      expect(gameServer.serverState.hotSeatStepDialog).to.deep.equal({
        actions: [{
          socketEvent: 'hotSeatConfirmWalkAway',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_CONFIRM_WALK_AWAY
      });
      expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
    });
  });

  describe('hotSeatConfirmWalkAway', function () {
    it('shouldDecrementHotSeatQuestionIndex', function() {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.hotSeatQuestionIndex = 0;
      gameServer.showHostSayGoodbyeToHotSeat = () => {};

      gameServer.hotSeatConfirmWalkAway(new MockSocket());

      expect(gameServer.serverState.hotSeatQuestionIndex).to.equal(-1);
    });

    it('shouldClearHotSeatAndShowHostStepDialog', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.showHostStepDialog = {};
      gameServer.serverState.hotSeatStepDialog = {};
      gameServer.showHostSayGoodbyeToHotSeat = () => {};

      gameServer.hotSeatConfirmWalkAway(new MockSocket());

      expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
    });

    it('shouldGradeHotSeatQuestionForContestants', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      var questionsGraded = false;
      gameServer.serverState.hotSeatQuestion.grader.grade = () => {
        questionsGraded = true;
      };
      gameServer.showHostSayGoodbyeToHotSeat = () => {};

      gameServer.hotSeatConfirmWalkAway(new MockSocket());

      expect(questionsGraded).to.be.true;
    });

    it('shouldCallShowHostSayGoodbyeToHotSeat', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      var called = false;
      gameServer.serverState.hotSeatQuestion.grader.grade = () => {};
      gameServer.showHostSayGoodbyeToHotSeat = () => { called = true; };

      gameServer.hotSeatConfirmWalkAway(new MockSocket());

      expect(called).to.be.true;
    });

    it('shouldSetWalkingAwayForGrader', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.showHostSayGoodbyeToHotSeat = () => {};

      gameServer.hotSeatConfirmWalkAway(new MockSocket());

      gameServer.serverState.hotSeatQuestion.grader.walkingAway.should.be.true;
    });
  });

  describe('hotSeatUseFiftyFifty', function () {
    it('shouldSetYesNoDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.hotSeatUseFiftyFifty();

      gameServer.serverState.showHostStepDialog.should.deep.equal({
        actions: [{
          socketEvent: 'hotSeatConfirmFiftyFifty',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_CONFIRM_FIFTY_FIFTY
      });
    });
  });

  describe('hotSeatConfirmFiftyFifty', function () {
    it('shouldUseFiftyFifty', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.hotSeatQuestion.revealAllChoices();
      gameServer.showHostRevealHotSeatChoice = () => {};

      gameServer.hotSeatConfirmFiftyFifty();

      gameServer.serverState.fiftyFifty.used.should.be.true;
    });

    it('shouldSetFiftyFiftyForGrader', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.hotSeatQuestion.revealAllChoices();
      gameServer.showHostRevealHotSeatChoice = () => {};

      gameServer.hotSeatConfirmFiftyFifty();

      gameServer.serverState.hotSeatQuestion.grader.fiftyFiftyLifeline.should.not.be.undefined;
    });
  });

  describe('hotSeatUsePhoneAFriend', function () {
    it('shouldSetYesNoDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.hotSeatUsePhoneAFriend();

      gameServer.serverState.showHostStepDialog.should.deep.equal({
        actions: [{
          socketEvent: 'hotSeatConfirmPhoneAFriend',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_CONFIRM_PHONE_A_FRIEND
      });
    });
  });

  describe('hotSeatConfirmPhoneAFriend', function () {
    it('shouldUsePhoneAFriend', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);

      gameServer.hotSeatConfirmPhoneAFriend();

      gameServer.serverState.phoneAFriend.used.should.be.true;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldResetStepDialogs', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.showHostStepDialog = {};
      gameServer.serverState.hotSeatStepDialog = {};

      gameServer.hotSeatConfirmPhoneAFriend();

      expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldSetTimerToPickAIFriendForNoOtherHumanPlayers', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.playerMap.getPlayerCountExcludingShowHost = () => { return 1; };

      gameServer.hotSeatConfirmPhoneAFriend();

      expect(gameServer.serverState.phoneAFriend.friend).to.be.undefined;
      gameServer.currentForcedTimer._onTimeout.should.not.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldNotSetTimerToPickAIFriendForOtherHumanPlayers', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.playerMap.getPlayerCountExcludingShowHost = () => { return 2; };

      gameServer.hotSeatConfirmPhoneAFriend();

      expect(gameServer.currentForcedTimer).to.be.undefined;
    });

    it('shouldSetExpectedInfoTextsWhenGoingToPickAI', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.hotSeatConfirmPhoneAFriend();

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_PHONE_A_FRIEND_RULES_AI);
      gameServer.serverState.hotSeatInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_PHONE_A_FRIEND_RULES_AI);
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldSetExpectedInfoTextsWhenNotGoingToPickAI', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.playerMap.getPlayerCountExcludingShowHost = () => { return 2; };
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.hotSeatConfirmPhoneAFriend();

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.SHOW_HOST_PHONE_A_FRIEND_RULES);
      gameServer.serverState.hotSeatInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_PHONE_A_FRIEND_RULES);
      gameServer.serverState.contestantInfoText.should.equal(
        LocalizedStrings.CONTESTANT_PHONE_A_FRIEND_RULES);
    });

    it('shouldSetPhoneAFriendForGrader', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);

      gameServer.hotSeatConfirmPhoneAFriend();

      gameServer.serverState.hotSeatQuestion.grader.phoneAFriendLifeline.should.not.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });
  });

  describe('hotSeatPickPhoneAFriend', function () {
    it('shouldSetFriendForHumanPlayer', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var player = new Player(new MockSocket('socket_id'), 'player');
      gameServer.playerMap.putPlayer(player);

      gameServer.hotSeatPickPhoneAFriend(new MockSocket(), {
        username: player.username
      });

      gameServer.serverState.phoneAFriend.friend.should.equal(player);
    });

    it('shouldSetExpectedFriendWhenUsingAI', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      gameServer.serverState.hotSeatQuestion.revealAllChoices();
      gameServer.serverState.phoneAFriend.startForQuestion(gameServer.serverState.hotSeatQuestion);

      gameServer.hotSeatPickPhoneAFriend(new MockSocket(), { useAI: true });

      expect(gameServer.serverState.phoneAFriend.friend).to.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldSetExpectedInfoTextsWhenNotUsingAI', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var player = new Player(new MockSocket('socket_id'), 'player');
      gameServer.playerMap.putPlayer(player);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.hotSeatPickPhoneAFriend(new MockSocket(), {
        username: player.username
      });

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.SHOW_HOST_PHONE_A_FRIEND_CHOOSING);
      gameServer.serverState.hotSeatInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_PHONE_A_FRIEND_CHOOSING);
      gameServer.serverState.contestantInfoText.should.equal(
        LocalizedStrings.CONTESTANT_PHONE_A_FRIEND_CHOOSING);
    });

    it('shouldSetExpectedInfoTextsWhenUsingAI', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.hotSeatQuestion = new HotSeatQuestion({
        text: 'questionText',
        orderedChoices: ['choice 1', 'choice 2', 'choice 3', 'choice 4']
      });
      gameServer.serverState.hotSeatQuestion.revealAllChoices();
      gameServer.serverState.phoneAFriend.startForQuestion(gameServer.serverState.hotSeatQuestion);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.hotSeatPickPhoneAFriend(new MockSocket(), { useAI: true });

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_PHONE_A_FRIEND_CHOOSING_AI);
      gameServer.serverState.hotSeatInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_PHONE_A_FRIEND_CHOOSING_AI);
      clearTimeout(gameServer.currentForcedTimer);
    });
  });

  describe('contestantSetPhoneConfidence', function () {
    it('shouldSetFriendConfidence', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.showHostRevealHotSeatChoice = () => {};

      gameServer.contestantSetPhoneConfidence(new MockSocket(), {
        confidence: 0.5
      });

      gameServer.serverState.phoneAFriend.friendConfidence.should.not.be.undefined;
    });

    it('shouldCallShowHostRevealHotSeatChoice', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var called = false;
      gameServer.showHostRevealHotSeatChoice = () => { called = true; };

      gameServer.contestantSetPhoneConfidence(new MockSocket(), {
        choice: Choices.A,
        confidence: 0.5
      });

      called.should.be.true;
    });
  });

  describe('hotSeatUseAskTheAudience', function () {
    it('shouldSetYesNoDialog', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.hotSeatUseAskTheAudience();

      gameServer.serverState.showHostStepDialog.should.deep.equal({
        actions: [{
          socketEvent: 'hotSeatConfirmAskTheAudience',
          text: LocalizedStrings.YES
        }, {
          socketEvent: 'showHostRevealHotSeatChoice',
          text: LocalizedStrings.NO
        }],
        header: LocalizedStrings.HOT_SEAT_CONFIRM_ASK_THE_AUDIENCE
      });
    });
  });

  describe('hotSeatConfirmAskTheAudience', function () {
    it('shouldUsePhoneAFriend', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);

      gameServer.hotSeatConfirmAskTheAudience();

      gameServer.serverState.askTheAudience.used.should.be.true;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldSetExpectedDialog', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.hotSeatStepDialog = {};

      gameServer.hotSeatConfirmAskTheAudience();

      expect(gameServer.serverState.showHostStepDialog.toCompressed()).to.deep.equal({
        actions: [{
          socketEvent: 'showHostStartAskTheAudience',
          text: LocalizedStrings.SHOW_HOST_START_ASK_THE_AUDIENCE
        }],
        header: ''
      });
      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
    });

    it('shouldSetExpectedInfoTexts', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.hotSeatConfirmAskTheAudience();

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.SHOW_HOST_ASK_THE_AUDIENCE_INTERLUDE);
      gameServer.serverState.hotSeatInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_ASK_THE_AUDIENCE_INTERLUDE);
      gameServer.serverState.contestantInfoText.should.equal(
        LocalizedStrings.CONTESTANT_ASK_THE_AUDIENCE_INTERLUDE);
    });

    it('shouldSetAskTheAudienceForGrader', function () {
      var gameServer = newGameServerWithHotSeatQuestion(/*showHostPresent=*/true);

      gameServer.hotSeatConfirmAskTheAudience();

      gameServer.serverState.hotSeatQuestion.grader.askTheAudienceLifeline.should.not.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });
  });

  describe('showHostStartAskTheAudience', function () {
    it('shouldSetTimer', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);

      gameServer.showHostStartAskTheAudience();

      gameServer.currentForcedTimer.should.not.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldFinishAskTheAudienceIfNoLongerWaiting', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.askTheAudience.waitingForContestants = () => { return false; };
      var finishAskTheAudienceCalled = false;
      gameServer.finishAskTheAudience = () => { finishAskTheAudienceCalled = true; };

      gameServer.showHostStartAskTheAudience();
      var onTimeout = gameServer.currentForcedTimer._onTimeout;
      clearTimeout(gameServer.currentForcedTimer);
      onTimeout();

      finishAskTheAudienceCalled.should.be.true;
    });

    it('shouldResetStepDialogs', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.showHostStepDialog = {};
      gameServer.serverState.hotSeatStepDialog = {};

      gameServer.showHostStartAskTheAudience();

      expect(gameServer.serverState.showHostStepDialog).to.be.undefined;
      expect(gameServer.serverState.hotSeatStepDialog).to.be.undefined;
      clearTimeout(gameServer.currentForcedTimer);
    });

    it('shouldSetExpectedInfoTexts', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      gameServer.serverState.clearEphemeralFields = () => {};

      gameServer.showHostStartAskTheAudience();

      gameServer.serverState.showHostInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_ASK_THE_AUDIENCE_VOTE);
      gameServer.serverState.hotSeatInfoText.should.equal(
        LocalizedStrings.HOT_SEAT_ASK_THE_AUDIENCE_VOTE);
      gameServer.serverState.contestantInfoText.should.equal(
        LocalizedStrings.CONTESTANT_ASK_THE_AUDIENCE_VOTE);
      clearTimeout(gameServer.currentForcedTimer);
    });
  });

  describe('finishAskTheAudience', function () {
    it('shouldPopulateBucketsAndGoBackToRevealHotSeatChoice', function () {
      var gameServer = newGameServerWithPlayerShowHost(true);
      var bucketsPopulated = false;
      var backToRevealHotSeatChoice = false;
      gameServer.serverState.askTheAudience.populateAllAnswerBuckets = () => {
        bucketsPopulated = true;
      };
      gameServer.showHostRevealHotSeatChoice = () => { backToRevealHotSeatChoice = true; };

      gameServer.finishAskTheAudience();

      bucketsPopulated.should.be.true;
      backToRevealHotSeatChoice.should.be.true;
    });
  });
});