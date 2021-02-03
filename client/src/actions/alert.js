import uuid from 'uuid/v4';     // Traversy declared 'uuid', threw error
import { SET_ALERT, REMOVE_ALERT } from './types';

export const setAlert = (msg, alertType, timeout = 5000) => dispatch => { // double arrow functions allowed b/c of Thunk middleware
    const id = uuid;   // Traversy declared id = uuid.v4(), but threw error. had to fix import
    dispatch({
        type: SET_ALERT,
        payload: { msg, alertType, id }
    });

    setTimeout(() => dispatch({ type: REMOVE_ALERT, payload: id}), timeout);
};