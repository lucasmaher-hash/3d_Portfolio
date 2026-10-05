import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Character, CHAR_IDS, CharId} from './Character';
import {DARK, PINK} from './lib';
import {FRIENDS, FriendRow, SearchBar, SpCard} from './Timetable';

/* Dev-only: the ported components at 1:1 app px, for side-by-side checks
   against screenshots of the real app (~/TEMP/Unify/web). */
export const UnifyLab: React.FC<{which: 'card' | 'chars'}> = ({which}) => {
  if (which === 'chars') {
    const ids = CHAR_IDS;
    return (
      <AbsoluteFill style={{background: PINK, display: 'flex', flexWrap: 'wrap', gap: 30, padding: 40, alignContent: 'flex-start'}}>
        {ids.map((b) =>
          ids.map((e) => (
            <div key={b + e} style={{width: 150, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Character id={b as CharId} eyes={e as CharId} width={120} />
            </div>
          )),
        )}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: DARK}}>
      <div style={{position: 'absolute', left: 100, top: 100}}>
        <SpCard day="montag" />
      </div>
      <div style={{position: 'absolute', left: 600, top: 100}}>
        <SpCard day="dienstag" />
      </div>
      <div style={{position: 'absolute', left: 1100, top: 100, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center', width: 377}}>
        <SearchBar />
        <FriendRow f={FRIENDS[0]} open={1} />
        <FriendRow f={FRIENDS[1]} />
        <FriendRow f={FRIENDS[3]} />
      </div>
    </AbsoluteFill>
  );
};
