import { createDraftSafeSelector } from '@reduxjs/toolkit';
import find from 'lodash/find';
import get from 'lodash/get';
import isUndefined from 'lodash/isUndefined';
import pick from 'lodash/pick';

import i18n from '../../i18n';
import editorModes from '../config/editorModes';
import defaultEditorHeight from '../config/editorSettings';
import editorThemes from '../config/editorThemes';
import GameStateCodes from '../config/gameStateCodes';
import SubscriptionTypeCodes from '../config/subscriptionTypes';
import { taskStateCodes } from '../config/task';
import userTypes from '../config/userTypes';
import { replayerMachineStates } from '../machines/game';
import { makeEditorTextKey } from '../utils/gameRoom';

export const currentUserIdSelector = state => state.user.currentUserId;

export const currentUserIsAdminSelector = state => state.user.users[state.user.currentUserId].isAdmin;

export const currentUserIsGuestSelector = state => state.user.users[state.user.currentUserId].isGuest;

export const subscriptionTypeSelector = state => (
  currentUserIsAdminSelector(state)
    ? SubscriptionTypeCodes.admin
    : SubscriptionTypeCodes.free
);

export const isShowGuideSelector = state => state.gameUI.isShowGuide;

export const gameIdSelector = state => state.game.gameStatus.gameId;

export const gamePlayersSelector = state => state.game.players;

export const firstPlayerSelector = state => find(gamePlayersSelector(state), { type: userTypes.firstPlayer });

export const secondPlayerSelector = state => find(gamePlayersSelector(state), { type: userTypes.secondPlayer });

export const opponentPlayerSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  return find(gamePlayersSelector(state), ({ id }) => id !== currentUserId);
};

const editorsMetaSelector = state => state.editor.meta;
export const editorTextsSelector = state => state.editor.text;
export const editorTextsHistorySelector = state => state.editor.textHistory;

export const gameStatusSelector = state => state.game.gameStatus;

export const getSolution = playerId => state => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);

  const { currentLangSlug } = meta;
  const text = editorTexts[makeEditorTextKey(playerId, currentLangSlug)];

  return {
    text,
    lang: currentLangSlug,
  };
};

export const editorDataSelector = (playerId, roomCurrent) => state => {
  const meta = editorsMetaSelector(state)[playerId];
  const editorTexts = editorTextsSelector(state);
  const editorTextsHistory = editorTextsHistorySelector(state);

  if (!meta) {
    return null;
  }
  const text = roomCurrent && roomCurrent.matches({ replayer: replayerMachineStates.on })
    ? editorTextsHistory[playerId]
    : editorTexts[makeEditorTextKey(playerId, meta.currentLangSlug)];

  const currentLangSlug = roomCurrent && roomCurrent.matches({
    replayer: replayerMachineStates.on,
  })
    ? meta.historyCurrentLangSlug
    : meta.currentLangSlug;

  return {
    ...meta,
    text,
    currentLangSlug,
  };
};

export const editorTextHistorySelector = (state, { userId }) => state.editor.textHistory[userId];

export const editorLangHistorySelector = (state, { userId }) => state.editor.langsHistory[userId];

export const firstEditorSelector = (state, roomCurrent) => {
  const playerId = firstPlayerSelector(state)?.id;
  return editorDataSelector(playerId, roomCurrent)(state);
};

export const secondEditorSelector = (state, roomCurrent) => {
  const playerId = secondPlayerSelector(state)?.id;
  return editorDataSelector(playerId, roomCurrent)(state);
};

export const leftEditorSelector = roomCurrent => createDraftSafeSelector(
  state => state,
  state => {
    const currentUserId = currentUserIdSelector(state);
    const player = get(gamePlayersSelector(state), currentUserId, false);
    const editorSelector = !!player && player.type === userTypes.secondPlayer
      ? secondEditorSelector
      : firstEditorSelector;
    return editorSelector(state, roomCurrent);
  },
);

export const rightEditorSelector = roomCurrent => createDraftSafeSelector(
  state => state,
  state => {
    const currentUserId = currentUserIdSelector(state);
    const player = get(gamePlayersSelector(state), currentUserId, false);
    const editorSelector = !!player && player.type === userTypes.secondPlayer
      ? firstEditorSelector
      : secondEditorSelector;
    return editorSelector(state, roomCurrent);
  },
);

export const editorSideSelector = (side, roomCurrent) => state => {
  const editors = {
    left: leftEditorSelector,
    right: rightEditorSelector,
  };
  return editors[side](roomCurrent)(state);
};

export const currentPlayerTextByLangSelector = lang => state => {
  const userId = currentUserIdSelector(state);
  const editorTexts = editorTextsSelector(state);
  return editorTexts[makeEditorTextKey(userId, lang)];
};

export const userLangSelector = userId => state => get(editorsMetaSelector(state)[userId], 'currentLangSlug', null);
export const userGameScoreSelector = createDraftSafeSelector(
  state => state.game.gameStatus.score,
  score => ({
    winnerId: score?.winnerId,
    results: score?.playerResults,
  }),
);

export const gameStatusTitleSelector = state => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.state) {
    case GameStateCodes.waitingOpponent:
      return i18n.t('%{state}', { state: i18n.t('Waiting for an opponent') });
    case GameStateCodes.playing:
      return i18n.t('%{state}', { state: i18n.t('Playing') });
    case GameStateCodes.gameOver:
      return i18n.t('%{state}', { state: gameStatus.msg });
    default:
      return '';
  }
};

export const gameTaskSelector = state => state.game.task;

export const canEditTask = state => state.builder.task.origin !== 'github'
  && ((currentUserIdSelector(state) === state.builder.task.creatorId
    && (state.builder.task.state === taskStateCodes.blank
      || state.builder.task.state === taskStateCodes.draft))
    || (currentUserIsAdminSelector(state)
      && state.builder.task.state !== taskStateCodes.moderation));

export const isTaskOwner = state => (
  currentUserIdSelector(state) === state.builder.task?.creatorId
  || currentUserIdSelector(state) === state.task?.creatorId
);

export const canEditTaskGenerator = state => (
  (currentUserIdSelector(state) === state.builder.task.creatorId
    && state.builder.task.state !== taskStateCodes.moderation
  ) || (currentUserIsAdminSelector(state)
    && state.builder.task.state !== taskStateCodes.moderation
  )
);

export const isValidTask = state => (
  state.builder.validationStatuses.name[0]
  && state.builder.validationStatuses.description[0]
  && state.builder.validationStatuses.assertsExamples[0]
  && state.builder.validationStatuses.solution[0]
  && state.builder.validationStatuses.argumentsGenerator[0]
);

export const builderTaskSelector = state => state.builder.task;

export const taskTemplatesStateSelector = state => state.builder.templates.state;

export const taskGeneratorLangSelector = state => state.builder.generatorLang;

export const taskOriginSelector = state => state.builder.task.origin;

export const taskAssertsSelector = state => state.builder.task.asserts;

export const taskAssertsStatusSelector = state => state.builder.assertsStatus;

export const taskTextSolutionSelector = state => state.builder.textSolution[state.builder.generatorLang];

export const taskTextArgumentsGeneratorSelector = state => state.builder.textArgumentsGenerator[state.builder.generatorLang];

export const taskParamsSelector = (params = { normalize: true }) => createDraftSafeSelector(
  state => state.builder.task,
  state => state.builder.task.inputSignature,
  state => state.builder.task.outputSignature,
  state => state.builder.task.asserts,
  state => state.builder.task.assertsExamples,
  state => state.builder.generatorLang,
  state => state.builder.textSolution,
  state => state.builder.textArgumentsGenerator,
  (
    task,
    inputSignature,
    outputSignature,
    asserts,
    assertsExamples,
    generatorLang,
    textSolution,
    textArgumentsGenerator,
  ) => ({
    ...task,
    inputSignature: inputSignature.map(item => (params.normalize ? pick(item, ['argumentName', 'type']) : item)),
    outputSignature: params.normalize ? pick(outputSignature, ['type']) : outputSignature,
    asserts: asserts.map(item => (params.normalize ? pick(item, ['arguments', 'expected']) : item)),
    assertsExamples: assertsExamples.map(item => (params.normalize ? pick(item, ['arguments', 'expected']) : item)),
    generatorLang,
    solution: textSolution[generatorLang],
    argumentsGenerator: textArgumentsGenerator[generatorLang],
  }),
);

export const taskParamsTemplatesStateSelector = state => state.builder.templates.state;

export const taskSolutionSelector = (state, lang) => state.builder.textSolution[lang];

export const taskArgumentsGeneratorSelector = (state, lang) => state.builder.textArgumentsGenerator[lang];

export const isTestingReady = state => (
  state.builder.validationStatuses.inputSignature[0]
  && state.builder.validationStatuses.outputSignature[0]
  && state.builder.validationStatuses.examples[0]
  && state.builder.validationStatuses.solution[0]
  && state.builder.validationStatuses.argumentsGenerator[0]
);

export const editorLangsSelector = state => state.editor.langs;

export const langInputSelector = state => state.editor.langInput;

export const editorHeightSelector = (roomCurrent, playerId) => state => {
  const editorData = editorDataSelector(playerId, roomCurrent)(state);
  return get(editorData, 'editorHeight', defaultEditorHeight);
};

export const executionOutputSelector = (playerId, roomCurrent) => state => (
  roomCurrent && roomCurrent.matches({ replayer: replayerMachineStates.on })
  ? state.executionOutput.historyResults[playerId]
  : state.executionOutput.results[playerId]);

export const firstExecutionOutputSelector = roomCurrent => state => {
  const playerId = firstPlayerSelector(state)?.id;
  return executionOutputSelector(playerId, roomCurrent)(state);
};

export const secondExecutionOutputSelector = roomCurrent => state => {
  const playerId = secondPlayerSelector(state)?.id;
  return executionOutputSelector(playerId, roomCurrent)(state);
};

export const leftExecutionOutputSelector = roomCurrent => state => {
  const currentUserId = currentUserIdSelector(state);
  const player = get(gamePlayersSelector(state), currentUserId, false);

  const outputSelector = player.type === userTypes.secondPlayer
    ? secondExecutionOutputSelector
    : firstExecutionOutputSelector;
  return outputSelector(roomCurrent)(state);
};

export const rightExecutionOutputSelector = roomCurrent => state => {
  const currentUserId = currentUserIdSelector(state);
  const player = get(gamePlayersSelector(state), currentUserId, false);

  const outputSelector = !!player && player.type === userTypes.secondPlayer
    ? firstExecutionOutputSelector
    : secondExecutionOutputSelector;
  return outputSelector(roomCurrent)(state);
};

export const tournamentIdSelector = state => state.tournament.id;

export const tournamentSelector = state => state.tournament;

export const currentUserIsTournamentOwnerSelector = state => state.tournament.creatorId === state.user.currentUserId;

export const tournamentShowResultsSelector = state => state.tournament.showResults;

export const tournamentOwnerIdSelector = state => state.tournament.ownerId;

export const tournamentPlayersSelector = state => state.tournament.players;

export const tournamentMatchesSelector = state => state.tournament.matches;

export const usersInfoSelector = state => state.usersInfo;

export const chatUsersSelector = state => state.chat.users;

export const chatMessagesSelector = state => state.chat.messages;

export const chatChannelStateSelector = state => state.chat.channel.online;

export const chatHistoryMessagesSelector = state => state.chat.history.messages;

export const currentChatUserSelector = state => {
  const currentUserId = currentUserIdSelector(state);

  return find(chatUsersSelector(state), { id: currentUserId });
};

export const editorsModeSelector = state => (
  state.gameUI.editorMode || editorModes.default
);

export const editorsThemeSelector = state => (
  state.gameUI?.editorTheme || editorThemes.dark
);

export const taskDescriptionLanguageselector = state => state.gameUI.taskDescriptionLanguage;

export const playbookStatusSelector = state => state.playbook.state;

export const playbookInitRecordsSelector = state => state.playbook.initRecords;

export const playbookRecordsSelector = state => state.playbook.records;

export const lobbyDataSelector = state => state.lobby;

export const usersStatsSelector = state => state.user.usersStats;

export const usersListSelector = state => state.user.usersRatingPage;

export const gameTypeSelector = state => state.game.gameStatus.type;

export const gameModeSelector = state => state.game.gameStatus.mode;

export const userSettingsSelector = state => state.user.settings;

export const gameUseChatSelector = state => state.game.useChat;

export const gameAlertsSelector = state => state.game.alerts;

export const isOpponentInGameSelector = state => {
  const findedUser = find(chatUsersSelector(state), {
    id: opponentPlayerSelector(state).id,
  });
  return !isUndefined(findedUser);
};

export const currentUserNameSelector = state => {
  const currentUserId = currentUserIdSelector(state);
  if (!currentUserId) {
    return 'Anonymous user';
  }
  return state.user.users[currentUserId].name;
};

export const activeGameSelector = state => {
  const currentUserId = currentUserIdSelector(state);

  const getMyGame = game => game.players.some(
    ({ id }) => id === currentUserId,
  );

  return state.lobby.activeGames.find(getMyGame);
};

export const isModalShow = state => state.lobby.createGameModal.show;

export const modalSelector = state => state.lobby.createGameModal;

export const completedGamesSelector = state => state.completedGames;

export const activeRoomSelector = state => state.chat.activeRoom;

export const roomsSelector = state => state.chat.rooms;
