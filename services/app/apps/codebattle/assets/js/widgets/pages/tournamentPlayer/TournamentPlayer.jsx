import React, { useState, useEffect, useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useInterpret } from '@xstate/react';
import cn from 'classnames';
import groupBy from 'lodash/groupBy';
import reverse from 'lodash/reverse';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import CountdownTimer from '@/components/CountdownTimer';
import {
  connectToEditor,
  connectToGame,
  updateGameChannel,
} from '@/middlewares/Room';
import { connectToSpectator } from '@/middlewares/Spectator';
import { connectToTournament, updateTournamentChannel } from '@/middlewares/Tournament';

import EditorUserTypes from '../../config/editorUserTypes';
import GameStateCodes from '../../config/gameStateCodes';
import MatchStatesCodes from '../../config/matchStates';
import TournamentStates from '../../config/tournament';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import useMatchesStatistics from '../../utils/useMatchesStatistics';
import Output from '../game/Output';
import OutputTab from '../game/OutputTab';
import TaskAssignment from '../game/TaskAssignment';

import SpectatorEditor from './SpectatorEditor';

const ResultModal = ({ solutionStatus, isWinner }) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (solutionStatus) {
      setTimeout(() => {
        setShowModal(true);
      }, 100);
    }
  }, [solutionStatus]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        setShowModal(false);
      }, 4000);
    }
  }, [showModal]);

  return (
    <Modal centered show={showModal}>
      <Modal.Body className="bg-light rounded-lg">
        <div className="d-flex bg-light justify-content-center align-items-center">
          <span className={`h2 ${isWinner ? 'text-success' : 'text-danger'}`}>
            {isWinner ? 'Won battle' : 'Lost battle'}
          </span>
        </div>
      </Modal.Body>
    </Modal>
  );
};

const RoundStatus = ({ playerId, matches }) => {
  const [
    player,
    opponent,
  ] = useMatchesStatistics(playerId, matches);

  const RoundStatistics = () => (
    <div className="d-flex text-center align-items-center justify-content-center">
      <div className="d-flex flex-column align-items-baseline">
        <span className="ml-2 h4">
          {'Wins: '}
          {player.winMatches.length}
        </span>
        <span className="ml-2 h4">
          {'Score: '}
          {Math.ceil(player.score)}
        </span>
        <span className="ml-2 h4">
          {`AVG Tests: ${Math.ceil(player.avgTests)}%`}
        </span>
        <span className="ml-4 h4">
          {'AVG Duration: '}
          {Math.ceil(player.avgDuration)}
          {' sec'}
        </span>
      </div>
    </div>
  );

  const RoundResultIcon = () => {
    if (
      player.winMatches.length === opponent.winMatches.length
      && player.score === opponent.score
      && player.avgTests === opponent.avgTests
      && player.avgDuration === opponent.avgDuration
    ) {
      return <FontAwesomeIcon className="ml-2 text-primary" icon="handshake" />;
    }

    if (
      player.score > opponent.score
      || (player.score === opponent.score
        && player.winMatches.length > opponent.winMatches.length)
      || (player.winMatches.length === opponent.winMatches.length
        && player.score === opponent.score
        && player.avgTests > opponent.avgTests)
      || (player.winMatches.length === opponent.winMatches.length
        && player.score === opponent.score
        && player.avgTests === opponent.avgTests
        && player.avgDuration > opponent.avgDuration)
    ) {
      return <FontAwesomeIcon className="ml-2 text-warning" icon="trophy" />;
    }

    return <FontAwesomeIcon className="ml-2 text-secondary" icon="trophy" />;
  };

  return (
    <div className="d-flex">
      <div className="d-flex justify-content-center align-items-center h1">
        <RoundResultIcon />
      </div>
      <RoundStatistics />
    </div>
  );
};

const getMatchIcon = (playerId, match) => {
  if (
    match.state === MatchStatesCodes.timeout
    || match.state === MatchStatesCodes.canceled
  ) {
    return <FontAwesomeIcon className="text-dark" icon="stopwatch" />;
  }

  if (playerId === match.winnerId) {
    return <FontAwesomeIcon className="text-warning" icon="trophy" />;
  }

  if (playerId !== match.winnerId) {
    return <FontAwesomeIcon className="text-muted" icon="trophy" />;
  }

  return <FontAwesomeIcon className="text-danger" icon="times" />;
};

const getSpectatorStatus = (state, task, gameId) => {
  switch (state) {
    case TournamentStates.finished:
      return 'Tournament is finished';
    case TournamentStates.waitingParticipants:
      return 'Tournament is waiting to start';
    case TournamentStates.cancelled:
      return 'Tournament is cancelled';
    default:
      break;
  }

  if (!task || !gameId) {
    return 'Game is loading';
  }

  return '';
};

function TournamentPlayer({ spectatorMachine }) {
  const dispatch = useDispatch();

  const [switchedWidgetsStatus, setSwitchedWidgetsStatus] = useState(false);
  const [taskSize, setTaskSize] = useState(0);

  const changeTaskDescriptionSizes = useCallback(
    size => {
      setTaskSize(size);
    },
    [setTaskSize],
  );

  const {
    startsAt,
    timeoutSeconds,
    state: gameState,
    solutionStatus,
  } = useSelector(selectors.gameStatusSelector);
  const tournament = useSelector(selectors.tournamentSelector);
  const task = useSelector(selectors.gameTaskSelector);
  const taskLanguage = useSelector(selectors.taskDescriptionLanguageselector);
  const { playerId, gameId } = useSelector(state => state.tournamentPlayer);

  const output = useSelector(selectors.executionOutputSelector(playerId));

  const isGameWinner = useSelector(state => (
    state.executionOutput.results[playerId]?.status === 'ok'
  ));

  const spectatorStatus = getSpectatorStatus(tournament.state, task, gameId);
  // TODO: if there is not active_match set html, LOADING

  const context = { userId: playerId, type: EditorUserTypes.player };
  const spectatorService = useInterpret(spectatorMachine, {
    context,
    devTools: true,
    actions: {},
  });

  const handleSwitchWidgets = useCallback(
    () => setSwitchedWidgetsStatus(state => !state),
    [setSwitchedWidgetsStatus],
  );
  const handleSetLanguage = lang => () => dispatch(actions.setTaskDescriptionLanguage(lang));

  useEffect(() => {
    // updateSpectatorChannel(playerId);

    if (playerId) {
      const clearSpectatorChannel = connectToSpectator()(dispatch);

      return () => {
        clearSpectatorChannel();
      };
    }

    return () => {};
  }, [playerId, dispatch]);

  useEffect(() => {
    updateTournamentChannel(tournament.id);

    if (tournament.id) {
      const clearTournamentConnection = connectToTournament()(dispatch);

      return () => {
        clearTournamentConnection();
      };
    }

    return () => {};
  }, [tournament.id, dispatch]);

  useEffect(() => {
    updateGameChannel(gameId);

    if (gameId) {
      const options = { cancelRedirect: true };

      const clearGameConnection = connectToGame(spectatorService, options)(dispatch);
      const clearEditorConnection = connectToEditor(spectatorService)(dispatch);

      return () => {
        clearGameConnection();
        clearEditorConnection();
      };
    }

    return () => {};
  }, [gameId, spectatorService, dispatch]);

  const spectatorDisplayClassName = cn('d-flex flex-column', {
    'flex-xl-row flex-lg-row': !switchedWidgetsStatus,
    'flex-xl-row-reverse flex-lg-row-reverse': switchedWidgetsStatus,
  });

  const spectatorGameStatusClassName = cn(
    'd-flex justify-content-around align-items-center w-100 p-2',
    {
      'flex-row-reverse': switchedWidgetsStatus,
    },
  );

  const GamePanel = () => (!spectatorStatus ? (
    <>
      <div>
        <TaskAssignment
          task={task}
          taskSize={taskSize}
          taskLanguage={taskLanguage}
          handleSetLanguage={handleSetLanguage}
          changeTaskDescriptionSizes={changeTaskDescriptionSizes}
          hideGuide
          hideContribution
        />
      </div>
      <div
        className="card border-0 shadow-sm h-50 mt-1"
        style={{ minHeight: '490px' }}
      >
        <div className={spectatorGameStatusClassName}>
          {GameStateCodes.playing !== gameState && <h3>Game Over</h3>}
          {startsAt && gameState === GameStateCodes.playing && (
          <CountdownTimer time={startsAt} timeoutSeconds={timeoutSeconds} />
            )}
          <OutputTab sideOutput={output} large />
        </div>
        <div
          style={{ minHeight: '400px' }}
          className="position-relative overflow-auto w-100 h-100"
        >
          <div className="position-absolute w-100 user-select-none">
            <Output sideOutput={output} />
          </div>
        </div>
      </div>
    </>
    ) : (
      <div className="card border-0 h-100 w-100">
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          {spectatorStatus}
        </div>
      </div>
    ));

  const MatchesPannel = () => {
    const groupedMatches = groupBy(Object.values(tournament.matches), 'round');
    const rounds = reverse(Object.keys(groupedMatches));

    const lastRound = rounds[0];

    if (!lastRound || !groupedMatches[lastRound]) {
      return (
        <div className="card bg-white rounded-lg flex justify-content-center align-items-center w-100 h-100">
          No statistics
        </div>
      );
    }

    return (
      <div className="card border-0 rounded-lg shadow-sm h-100">
        <div className="p-2 d-flex h-100 w-100">
          <div className="d-flex flex-column w-100 overflow-auto">
            <h2 className="mb-4">Round Statistics:</h2>
            <div className="mt-2">
              <RoundStatus
                playerId={playerId}
                matches={groupedMatches[lastRound]}
              />
            </div>

            <h2 className="mb-4 mt-2 border-top">Matches:</h2>
            <div>
              {groupedMatches[lastRound].map(match => (
                <div
                  className="d-flex text-center align-items-center"
                  key={match.id}
                >
                  <span className="h3">{getMatchIcon(playerId, match)}</span>
                  {match.playerResults[playerId] ? (
                    <div className="d-flex flex-column align-items-baseline">
                      <span className="ml-4 h4">
                        {'Duration: '}
                        {match.playerResults[playerId].durationSec}
                        {' sec'}
                      </span>
                      <span className="ml-2 h4">
                        {'Score: '}
                        {match.playerResults[playerId].score}
                      </span>
                      <span className="ml-2 h4">
                        {`Tests: ${match.playerResults[playerId].resultPercent}%`}
                      </span>
                    </div>
                  ) : (
                    <span className="ml-4 h3">¯\_(ツ)_/¯</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid d-flex flex-column min-vh-100">
        <ResultModal isWinner={isGameWinner} solutionStatus={solutionStatus} />
        <div className={spectatorDisplayClassName} style={{ flex: '1 1 auto' }}>
          <div className="d-flex flex-column col-12 col-xl-4 col-lg-6 p-1">
            {tournament.breakState === 'off'
            && tournament.state === TournamentStates.active ? (
              <GamePanel />
            ) : (
              <MatchesPannel />
            )}
          </div>
          <SpectatorEditor
            switchedWidgetsStatus={switchedWidgetsStatus}
            handleSwitchWidgets={handleSwitchWidgets}
            spectatorService={spectatorService}
            playerId={playerId}
          />
        </div>
      </div>
    </>
  );
}

export default TournamentPlayer;
