import React, { useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

import FeedbackAlertNotification from '../components/FeedbackAlertNotification';
import FeedbackWidget from '../components/FeedbackWidget';
import GameWidgetGuide from '../components/GameWidgetGuide';
import RoomContext from '../components/RoomContext';
import GameStateCodes from '../config/gameStateCodes';
import PageNames from '../config/pageNames';
import sound from '../lib/sound';
import * as machineSelectors from '../machines/selectors';
import * as ChatActions from '../middlewares/Chat';
import * as GameRoomActions from '../middlewares/Room';
import * as selectors from '../selectors';
import { actions } from '../slices';
import useGameRoomMachine from '../utils/useGameRoomMachine';
import useGameRoomModals from '../utils/useGameRoomModals';
import useMachineStateSelector from '../utils/useMachineStateSelector';

import BuilderEditorsWidget from './builder/BuilderEditorsWidget';
import BuilderSettingsWidget from './builder/BuilderSettingsWidget';
import CodebattlePlayer from './game/CodebattlePlayer';
import GameWidget from './game/GameWidget';
import InfoWidget from './game/InfoWidget';
import NetworkAlert from './game/NetworkAlert';
import TimeoutGameInfo from './game/TimeoutGameInfo';
import WaitingOpponentInfo from './game/WaitingOpponentInfo';

function GameRoomWidget({
  pageName,
  mainMachine,
  taskMachine,
  editorMachine,
}) {
  const dispatch = useDispatch();

  const gameStatus = useSelector(selectors.gameStatusSelector);

  const tournamentId = gameStatus?.tournamentId;
  const firstPlayer = useSelector(selectors.firstPlayerSelector);
  const secondPlayer = useSelector(selectors.secondPlayerSelector);

  const useChat = useSelector(selectors.gameUseChatSelector);
  const mute = useSelector(state => state.user.settings.mute);
  const machines = useGameRoomMachine({
    mainMachine,
    taskMachine,
  });

  const roomCurrent = useMachineStateSelector(
    machines.mainService,
    machineSelectors.roomStateSelector,
  );
  const inBuilderRoom = machineSelectors.inBuilderRoomSelector(roomCurrent);
  const inPreviewRoom = machineSelectors.inPreviewRoomSelector(roomCurrent);
  const inWaitingRoom = machineSelectors.inWaitingRoomSelector(roomCurrent);
  const replayerIsOpen = machineSelectors.openedReplayerSelector(roomCurrent);
  const gameRoomKey = machineSelectors.gameRoomKeySelector(roomCurrent);

  useGameRoomModals(machines);

  useEffect(() => {
    if (pageName === PageNames.builder) {
      const clearTask = GameRoomActions.connectToTask(
        machines.mainService,
        machines.taskService,
      )(dispatch);

      return clearTask;
    }

    const options = { cancelRedirect: false };

    const clearGame = GameRoomActions.connectToGame(machines.mainService, options)(
      dispatch,
    );
    const clearChat = ChatActions.connectToChat(useChat)(dispatch);

    return () => {
      clearGame();
      clearChat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const muteSound = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();

        if (mute) {
          sound.toggle();
        } else {
          sound.toggle(0);
        }

        actions.toggleMuteSound();
      }
    };

    window.addEventListener('keydown', muteSound);

    return () => {
      window.removeEventListener('keydown', muteSound);
    };
  }, [mute]);

  if (inWaitingRoom || gameStatus.state === GameStateCodes.waitingOpponent) {
    const gameUrl = window.location.href;
    return <WaitingOpponentInfo gameUrl={gameUrl} />;
  }

  if (gameStatus.state === GameStateCodes.timeout && !(firstPlayer && secondPlayer)) {
    return <TimeoutGameInfo />;
  }

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={gameRoomKey}
        addEndListener={(node, done) => {
          node.addEventListener('transitionend', done, false);
        }}
        classNames={`game-room-${gameRoomKey}`}
      >
        <RoomContext.Provider value={machines}>
          <div className="x-outline-none">
            <GameWidgetGuide tournamentId={tournamentId} />
            <NetworkAlert />
            <FeedbackAlertNotification />
            <div className="container-fluid">
              <div className="row no-gutter cb-game">
                {inBuilderRoom || (pageName === 'builder' && inPreviewRoom) ? (
                  <>
                    <BuilderSettingsWidget />
                    <BuilderEditorsWidget />
                  </>
                ) : (
                  <>
                    <InfoWidget />
                    <GameWidget editorMachine={editorMachine} />
                  </>
                )}
                {mute && (
                  <div className="rounded p-2 bg-dark cb-mute-icon">
                    <FontAwesomeIcon
                      size="lg"
                      color="white"
                      icon={['fas', 'volume-mute']}
                    />
                  </div>
                )}
                {!replayerIsOpen && <FeedbackWidget />}
              </div>
            </div>
            {replayerIsOpen && <CodebattlePlayer roomCurrent={roomCurrent} />}
          </div>
        </RoomContext.Provider>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default GameRoomWidget;
