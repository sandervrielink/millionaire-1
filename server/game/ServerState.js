const AskTheAudienceLifeline = require(process.cwd() + '/server/lifeline/AskTheAudienceLifeline.js');
const FiftyFiftyLifeline = require(process.cwd() + '/server/lifeline/FiftyFiftyLifeline.js');
const HotSeatQuestion = require(process.cwd() + '/server/question/HotSeatQuestion.js');
const LifelineIndex = require(process.cwd() + '/server/question/LifelineIndex.js');
const LocalizedStrings = require(process.cwd() + '/localization/LocalizedStrings.js');
const Logger = require(process.cwd() + '/server/logging/Logger.js');
const PhoneAFriendLifeline = require(process.cwd() + '/server/lifeline/PhoneAFriendLifeline.js');

const contestantChoosableEvents = new Set([
  'showHostRevealHotSeatChoice',
  'hotSeatChoose',
  'hotSeatUseFiftyFifty',
  'hotSeatUsePhoneAFriend',
  'hotSeatConfirmPhoneAFriend',
  'hotSeatPickPhoneAFriend',
  'hotSeatUseAskTheAudience',
  'hotSeatConfirmAskTheAudience',
  'showHostStartAskTheAudience',
  'hotSeatWalkAway'
]);
const hotSeatChoosableEvents = new Set(['showHostRevealHotSeatChoice']);
const fastestFingerChoosableEvents = new Set(['showHostRevealFastestFingerQuestionChoices']);
const showFastestFingerResultsEvents = new Set([
  'showHostRevealFastestFingerResults',
  'showHostAcceptHotSeatPlayer'
]);
const showLifelineResultsEvents = new Set([
  'showHostRevealHotSeatChoice',
  'hotSeatChoose',
  'hotSeatFinalAnswer',
  'hotSeatUseFiftyFifty',
  'hotSeatUsePhoneAFriend',
  'hotSeatUseAskTheAudience',
  'hotSeatWalkAway'
]);

// Encapsulates the state of a running game on the server side.
class ServerState {

  constructor (playerMap) {
    // PlayerMap of the game
    this.playerMap = playerMap;

    // Reference to player who is show host
    this.showHost = undefined;

    // More fields declared in this method
    this.startNewRound();
  }


  // PRIVATE METHODS

  // Returns a list of all Players, compressed for transfer over a socket message.
  _getCompressedPlayerList(phoneAFriendSelectable) {
    var compressedPlayerList = [];
    var clickAction = phoneAFriendSelectable ? 'hotSeatPickPhoneAFriend' : undefined;

    this.playerMap.getPlayerListExcludingShowHost().forEach((player, index) => {
      // Hot seat players should not be able to click on themselves.
      var filteredClickAction = player.isHotSeatPlayer ? undefined : clickAction;
      compressedPlayerList.push(player.toCompressed(filteredClickAction));
    });

    return compressedPlayerList;
  }


  // PUBLIC METHODS

  // Clears all player answers, regardless of question type.
  clearAllPlayerAnswers() {
    this.playerMap.doAll((player) => { player.clearAllAnswers(); });
  }

  // Clears any fields meant to be sent to the client for one update at a time.
  clearEphemeralFields() {
    // Info texts should only appear for one socket event at a time. Any exceptions should be
    // handled from the GameServer.
    this.hotSeatInfoText = undefined;
    this.contestantInfoText = undefined;
    this.showHostInfoText = undefined;
    // Audio commands are meant to be executed once.
    this.audioCommand = undefined;
  }

  // Clears the timers associated with this server state.
  clearTimers() {
    if (this.showHostStepDialog) {
      this.showHostStepDialog.clearTimeout();
    }
    if (this.hotSeatStepDialog) {
      this.hotSeatStepDialog.clearTimeout();
    }
  }

  // Returns whether a contestant can choose during the given socket event.
  contestantCanChoose(currentSocketEvent) {
    return contestantChoosableEvents.has(currentSocketEvent) &&
      this.hotSeatQuestion !== undefined && this.hotSeatQuestion.allChoicesRevealed();
  }

  // Returns whether the hot seat player can choose during the given socket event.
  hotSeatPlayerCanChoose(currentSocketEvent) {
    return hotSeatChoosableEvents.has(currentSocketEvent) &&
      this.hotSeatQuestion !== undefined && this.hotSeatQuestion.allChoicesRevealed();
  }

  // Returns whether the given player is a contestant (i.e not in the hot seat or show hosting).
  playerIsContestant(player) {
    return player && player.isContestant();
  }

  // Returns whether the given player is the hot seat player.
  playerIsHotSeatPlayer(player) {
    return this.hotSeatPlayer !== undefined && player == this.hotSeatPlayer;
  }

  // Returns whether the given player is host.
  playerIsShowHost(player) {
    return this.showHost !== undefined && player == this.showHost;
  }

  // Returns whether a player is acting as show host.
  playerShowHostPresent() {
    return this.showHost !== undefined;
  }

  // Resets the fastest finger question state back to default.
  resetFastestFinger() {
    this.fastestFingerQuestion = undefined;
    this.clearAllPlayerAnswers();
  }

  // Resets the hot seat question.
  resetHotSeatQuestion() {
    this.hotSeatQuestion = undefined;
    this.clearAllPlayerAnswers();
  }

  // Sets the current celebration banner.
  setCelebrationBanner(celebrationBanner) {
    this.celebrationBanner = celebrationBanner;
  }

  // Sets the hot seat player of this game using the given username.
  setHotSeatPlayerByUsername(hotSeatPlayerUsername) {
    this.hotSeatPlayer = this.playerMap.getPlayerByUsername(hotSeatPlayerUsername);
    if (this.hotSeatPlayer) {
      this.hotSeatPlayer.isHotSeatPlayer = true;
    }
  }

  // Sets the next action to be taken when the host steps the game.
  //
  // Expected action format: {
  //   array actions,
  //   string header
  // }
  setHotSeatStepDialog(action) {
    this.hotSeatStepDialog = action;
  }

  // Sets the show host of this game using the given username.
  setShowHostByUsername(showHostUsername) {
    this.showHost = this.playerMap.getPlayerByUsername(showHostUsername);
    if (this.showHost) {
      this.showHost.isShowHost = true;
    }
  }

  // Sets the next action to be taken when the host steps the game.
  //
  // Expected action format: {
  //   array actions,
  //   string header
  // }
  setShowHostStepDialog(action) {
    this.showHostStepDialog = action;
  }

  // Starts a fresh round with the same show host.
  startNewRound(keepHotSeatPlayer = false) {
    // Reference to player in hot seat
    if (!keepHotSeatPlayer) {
      if (this.hotSeatPlayer) {
        this.hotSeatPlayer.isHotSeatPlayer = false;
      }
      this.hotSeatPlayer = undefined;
    }

    // Map of availability of lifelines
    this.lifelinesAvailable = {};
    this.lifelinesAvailable[LifelineIndex.FIFTY_FIFTY] = true;
    this.lifelinesAvailable[LifelineIndex.PHONE_A_FRIEND] = true;
    this.lifelinesAvailable[LifelineIndex.ASK_THE_AUDIENCE] = true;

    // StepDialog to be shown to the host
    this.showHostStepDialog = undefined;

    // StepDialog to be shown to the hot seat player
    this.hotSeatStepDialog = undefined;

    // Reference to the current hot seat question
    this.resetHotSeatQuestion();

    // What question this server is on (e.g. 0 = $100, 14 = $1 million)
    //
    // Set to -1 for default state, as it will be incremented before first use.
    this.hotSeatQuestionIndex = -1;

    // Reference to the current fastest finger question
    this.fastestFingerQuestion = undefined;

    // Lifelines
    this.fiftyFifty = new FiftyFiftyLifeline(this.playerMap);
    this.phoneAFriend = new PhoneAFriendLifeline(this.playerMap);
    this.askTheAudience = new AskTheAudienceLifeline(this.playerMap);

    // Banner element that appears on a celebration moment
    this.celebrationBanner = undefined;

    // Separate infoText fields for each role, that way relevant information can be displayed on
    // screen for all clients.
    this.hotSeatInfoText = undefined;
    this.contestantInfoText = undefined;
    this.showHostInfoText = undefined;

    // Command to send to client AudioPlayer.
    this.audioCommand = undefined;
  }

  // Returns a compressed, JSON-formatted version of client state to pass to the client via socket.
  toCompressedClientState(socket, currentSocketEvent) {
    var compressed = {};
    var player = this.playerMap.getPlayerBySocket(socket);

    compressed.clientIsShowHost = this.playerIsShowHost(player);
    compressed.clientIsHotSeat = this.playerIsHotSeatPlayer(player);
    compressed.clientIsContestant = this.playerIsContestant(player);

    // The host might need to have a dialog that can step the game through.
    if (compressed.clientIsShowHost && this.showHostStepDialog !== undefined) {
      compressed.showHostStepDialog = this.showHostStepDialog.toCompressed();
    }
    // The hot seat player might need to have a dialog that can step the game through.
    if (compressed.clientIsHotSeat && this.hotSeatStepDialog !== undefined) {
      compressed.hotSeatStepDialog = this.hotSeatStepDialog.toCompressed();
    }
    // Set info texts.
    if (compressed.clientIsShowHost) {
      compressed.infoText = this.showHostInfoText;
    } else if (compressed.clientIsHotSeat) {
      compressed.infoText = this.hotSeatInfoText;
    } else {
      compressed.infoText = this.contestantInfoText;
    }
    // If we are in an event that allows for fastest finger choosing, make choice buttons active by
    // setting choice actions.
    if (!compressed.clientIsShowHost && fastestFingerChoosableEvents.has(currentSocketEvent)) {
      compressed.choiceAction = 'contestantFastestFingerChoose';
    }
    // If we are in an event that allows for choosing, make choice buttons active by setting choice
    // actions.
    if (compressed.clientIsHotSeat && this.hotSeatPlayerCanChoose(currentSocketEvent)) {
      compressed.choiceAction = 'hotSeatChoose';
    } else if (compressed.clientIsContestant && this.contestantCanChoose(currentSocketEvent)) {
      compressed.choiceAction = 'contestantChoose';
    }
    // Fastest finger question
    if (this.fastestFingerQuestion !== undefined) {
      compressed.question = this.fastestFingerQuestion.toCompressed(
        /*madeChoices=*/player.fastestFingerChoices);
      // Fastest finger answer results
      if (this.fastestFingerQuestion.revealedAnswers.length > 0) {
        compressed.fastestFingerRevealedAnswers = this.fastestFingerQuestion.revealedAnswers;
      }
    }
    // Fastest finger results
    if (showFastestFingerResultsEvents.has(currentSocketEvent)) {
      compressed.fastestFingerRevealedAnswers = undefined;
      var fastestFingerResults = this.fastestFingerQuestion.getResults();
      compressed.fastestFingerResults = fastestFingerResults.playerResults;
      this.setHotSeatPlayerByUsername(fastestFingerResults.hotSeatPlayer ?
        fastestFingerResults.hotSeatPlayer.username : undefined);
      compressed.fastestFingerBestScore = this.hotSeatPlayer ?
          this.hotSeatPlayer.fastestFingerScore : 0;
    }
    // Hot seat question
    if (this.hotSeatQuestion !== undefined) {
      var madeChoiceToDisplay = compressed.clientIsShowHost ?
        this.hotSeatPlayer.hotSeatChoice :
        player.hotSeatChoice;
      var showCorrectChoice = compressed.clientIsShowHost ?
        this.hotSeatQuestion.correctChoiceRevealedForShowHost :
        this.hotSeatQuestion.correctChoiceRevealedForAll;
      compressed.question = this.hotSeatQuestion.toCompressed(madeChoiceToDisplay,
        showCorrectChoice);
    }
    // Hot seat action buttons
    var actionButtonsAvailable = compressed.clientIsHotSeat
      && this.hotSeatPlayerCanChoose(currentSocketEvent);
    compressed.walkAwayActionButton = {
      used: false,
      socketEvent: 'hotSeatWalkAway',
      available: actionButtonsAvailable
    };
    compressed.fiftyFiftyActionButton = this.fiftyFifty.toCompressedHotSeatActionButton(
      actionButtonsAvailable);
    compressed.phoneAFriendActionButton = this.phoneAFriend.toCompressedHotSeatActionButton(
      actionButtonsAvailable);
    compressed.askTheAudienceActionButton = this.askTheAudience.toCompressedHotSeatActionButton(
      actionButtonsAvailable);
    // Phone a friend elements
    if (this.phoneAFriend.isActiveForQuestionIndex(this.hotSeatQuestionIndex)) {
      if (this.phoneAFriend.friend == player) {
        if (this.phoneAFriend.waitingForChoiceFromPlayer(player)) {
          compressed.infoText = LocalizedStrings.CONTESTANT_PHONE_A_FRIEND_NO_CHOICE;
        } else if (this.phoneAFriend.waitingForConfidenceFromPlayer(player)) {
          compressed.showPhoneConfidenceMeter = true;
        }
      } else if (compressed.clientIsContestant && this.phoneAFriend.friend) {
        compressed.infoText = LocalizedStrings.CONTESTANT_PHONE_A_FRIEND_WAIT;
      }
    }
    if (this.phoneAFriend.hasResultsForQuestionIndex(this.hotSeatQuestionIndex)
        && showLifelineResultsEvents.has(currentSocketEvent)) {
      compressed.phoneAFriendResults = this.phoneAFriend.getResults();
    }
    // Ask the audience elements
    if (this.askTheAudience.hasResultsForQuestionIndex(this.hotSeatQuestionIndex)
        && showLifelineResultsEvents.has(currentSocketEvent)) {
      compressed.askTheAudienceResults = this.askTheAudience.getResults();
    }
    // Player list will always show up.
    compressed.playerList = this._getCompressedPlayerList(
      compressed.clientIsHotSeat && currentSocketEvent == 'hotSeatConfirmPhoneAFriend');
    // Hot seat question index will always be set to configure money tree.
    compressed.hotSeatQuestionIndex = this.hotSeatQuestionIndex;
    // Celebration banner will show up as long as it is defined.
    compressed.celebrationBanner = this.celebrationBanner;
    // Audio command will always be set, as long as one is present.
    compressed.audioCommand = this.audioCommand;

    return compressed;
  }
}

module.exports = ServerState;