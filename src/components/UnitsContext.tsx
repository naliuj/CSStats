import { createContext, useContext } from 'react';
import { TIME_UNITS, type Units } from '../lib/units';

/** How results are shown in the current view: times, or Fewest Moves counts. */
const UnitsContext = createContext<Units>(TIME_UNITS);

export const UnitsProvider = UnitsContext.Provider;
export const useUnits = () => useContext(UnitsContext);
