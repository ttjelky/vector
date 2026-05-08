/**
 * useTournamentTabGuard
 *
 * Виклич цей хук всередині сторінки турніру.
 * Він слідкує за статусом і автоматично закриває вкладку + редіректить,
 * якщо турнір видалено або користувача виключено.
 *
 * Приклад використання:
 *
 *   const TournamentPage = () => {
 *     const { id } = useParams();
 *     const { tournament, loading, error } = useTournamentData(id);
 *
 *     useTournamentTabGuard(id, {
 *       isDeleted: error?.status === 404,
 *       isKicked:  error?.status === 403,
 *     });
 *
 *     ...
 *   };
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from './TabsContext';

/**
 * @param {string|number} tournamentId  - ID турніру поточної сторінки
 * @param {object}        options
 * @param {boolean}       options.isDeleted - true, якщо турнір не знайдено (404)
 * @param {boolean}       options.isKicked  - true, якщо нема доступу (403)
 * @param {string}        [options.redirectTo='/tournaments'] - куди редіректити
 */
const useTournamentTabGuard = (
  tournamentId,
  { isDeleted = false, isKicked = false, redirectTo = '/tournaments' } = {}
) => {
  const { removeTabById } = useTabs();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!tournamentId) return;
    if (handledRef.current) return;

    if (isDeleted || isKicked) {
      handledRef.current = true;
      removeTabById(tournamentId);
      navigate(redirectTo, { replace: true });
    }
  }, [isDeleted, isKicked, tournamentId, removeTabById, navigate, redirectTo]);
};

export default useTournamentTabGuard;
