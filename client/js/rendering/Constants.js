const X_RATIO = 16;
const Y_RATIO = 9;
const ASPECT_RATIO = X_RATIO / Y_RATIO;
const BACKGROUND_SIDE_RATIO = 4 / 16;
const BOTTOM_SIDE_HEIGHT_RATIO = 1 / 3;
const WIDTH_SQUARE_RATIO = ((X_RATIO - Y_RATIO) / 2) / X_RATIO;

module.exports.ASPECT_RATIO = ASPECT_RATIO;
module.exports.BACKGROUND_SIDE_RATIO = BACKGROUND_SIDE_RATIO;
module.exports.BOTTOM_SIDE_HEIGHT_RATIO = BOTTOM_SIDE_HEIGHT_RATIO;
module.exports.FASTEST_FINGER_RESULT_HEIGHT_RATIO = (1 - BOTTOM_SIDE_HEIGHT_RATIO) / 12;
module.exports.FASTEST_FINGER_RESULT_WIDTH_RATIO = (1 - 2 * BACKGROUND_SIDE_RATIO) * 0.7;
module.exports.QUESTION_CHOICE_HEIGHT_RATIO = 1.2 / X_RATIO;
module.exports.QUESTION_CHOICE_WIDTH_RATIO = 4.1 / X_RATIO;
module.exports.QUESTION_HEIGHT_RATIO = 2 / X_RATIO;
module.exports.QUESTION_WIDTH_RATIO = Y_RATIO / X_RATIO;
module.exports.SIDE_PANEL_LINE_WIDTH = 3;
module.exports.WIDTH_SQUARE_RATIO = WIDTH_SQUARE_RATIO;