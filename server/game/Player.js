const Choices = require(process.cwd() + '/server/question/Choices.js');
const PlayerDisplay = require(process.cwd() + '/server/game/PlayerDisplay.js');

// Encapsulates a player and their possible actions in Millionaire With Friends.
class Player {

  // Constructs a new Player from the given information.
  constructor(socket, username) {
    this.socket = socket;
    this.username = username;
    this.money = 0;
    this.fastestFingerChoices = [];
    this.fastestFingerScore = 0;
    this.fastestFingerTime = undefined;
    this.hotSeatChoice = undefined;
    this.hotSeatTime = undefined;
    this.isShowHost = false;
    this.isHotSeatPlayer = false;
    this.selectedForPhoneAFriend = false;
  }


  // PUBLIC METHODS

  // Adds the given choice to the Player's fastest finger choices.
  //
  // The choice is expected to be a value from Choices.js.
  chooseFastestFinger(choice) {
    if (Choices.isValidChoice(choice) &&
        !this.hasAlreadyChosenFastestFingerChoice(choice) && this.hasFastestFingerChoicesLeft()) {
      this.fastestFingerChoices.push(choice);
      // Last choice should keep track of the time to allow for calculating elapsed time
      if (this.fastestFingerChoices.length == Choices.MAX_CHOICES) {
        this.fastestFingerTime = Date.now();
      }
    }
  }

  // Chooses an answer for a hot seat question for this Player.
  //
  // Time of answer is tracked in calculation of contestant money. A changed answer will reset the
  // time of answer.
  chooseHotSeat(choice) {
    if (Choices.isValidChoice(choice) && (this.hotSeatChoice === undefined ||
        this.hotSeatChoice !== choice)) {
      this.hotSeatChoice = choice;
      this.hotSeatTime = Date.now();
    }
  }

  // Clears all answers given by the Player.
  clearAllAnswers() {
    this.fastestFingerChoices = [];
    this.fastestFingerTime = undefined;
    this.hotSeatChoice = undefined;
    this.hotSeatTime = undefined;
  }

  // Returns whether the player is able to add another choice to their fastest finger choice
  // selection.
  hasFastestFingerChoicesLeft() {
    return this.fastestFingerChoices.length < Choices.MAX_CHOICES;
  }

  // Returns whether the player has already selected the given choice on fastest finger.
  hasAlreadyChosenFastestFingerChoice(choice) {
    return this.fastestFingerChoices.includes(choice);
  }

  // Returns whether the player is a contestant.
  isContestant() {
    return !this.isShowHost && !this.isHotSeatPlayer;
  }

  // Resets the player to base stats.
  reset() {
    this.money = 0;
    this.clearAllAnswers();
  }

  // Returns a compressed version of the Player, suitable for transfer over a socket message.
  toCompressed(clickAction = undefined) {
    return {
      username: this.username,
      money: this.money,
      display: PlayerDisplay.getDisplayFromPlayer(this),
      clickAction: clickAction
    };
  }
}

module.exports = Player;
