import React, {
  memo, useCallback, useState,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import Collapse from 'react-bootstrap/Collapse';

import UsersMatchList from './UsersMatchList';

function TournamentUserPanel({
  matches,
  currentUserId,
  userId,
  name,
  score,
  // place,
  // localPlace,
  searchedUserId = 0,
}) {
  const [open, setOpen] = useState(false);

  const panelClassName = cn(
    'd-flex flex-column border shadow-sm rounded-lg mb-2 overflow-auto',
    {
      'border-success': userId === currentUserId,
      'border-primary': userId === searchedUserId,
    },
  );

  const titleClassName = cn(
    'd-flex align-items-center justify-content-start px-2 py-1',
  );

  const handleOpenMatches = useCallback(event => {
    event.preventDefault();
    setOpen(!open);
  }, [open, setOpen]);

  return (
    <div className={panelClassName}>
      <div
        className={titleClassName}
        onClick={handleOpenMatches}
        aria-hidden
        aria-expanded={open}
        aria-controls={`collapse-matches-${userId}`}
      >
        <div className="d-flex">
          <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-row">
            <div>
              <span className="text-nowrap" title={name}>
                {searchedUserId === userId && (<span className="badge badge-primary mr-2">Search</span>)}
                {currentUserId === userId && (<span className="badge badge-success text-white mr-2">you</span>)}
                {name}
              </span>
              <span className="d-none d-sm-inline d-md-inline d-lg-inline mx-1">
                |
              </span>
            </div>
            <div className="d-flex align-items-center text-nowrap">
              <span title="Score" className="text-nowrap">
                <FontAwesomeIcon className="text-warning" icon="star" />
                {': '}
                {score}
              </span>
              {/* {place && ( */}
              {/*   <> */}
              {/*     <span className="mx-1">|</span> */}
              {/*     <span title="Place on tournament"> */}
              {/*       <FontAwesomeIcon className="text-warning" icon="trophy" /> */}
              {/*       {': '} */}
              {/*       {place} */}
              {/*     </span> */}
              {/*   </> */}
              {/* )} */}
              {/* {localPlace && ( */}
              {/*   <> */}
              {/*     <span className="mx-1">|</span> */}
              {/*     <span title="Place on local group"> */}
              {/*       <FontAwesomeIcon className="text-secondary" icon="trophy" /> */}
              {/*       {': '} */}
              {/*       {localPlace} */}
              {/*     </span> */}
              {/*   </> */}
              {/* )} */}
            </div>
          </div>
        </div>
        <div className="d-flex ml-1">
          <button
            type="button"
            className="btn"
            onClick={handleOpenMatches}
          >
            <FontAwesomeIcon icon={open ? 'chevron-up' : 'chevron-down'} />
          </button>
        </div>
      </div>
      <Collapse in={open}>
        <div id="collapse-matches-one" className="border-top">
          <UsersMatchList currentUserId={currentUserId} playerId={userId} matches={matches} />
        </div>
      </Collapse>
    </div>
  );
}

export default memo(TournamentUserPanel);
