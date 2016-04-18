import { createStore, applyMiddleware, compose } from 'redux'
import thunkMiddleware from 'redux-thunk'
import createLogger from 'redux-logger'
import rootReducer from '../reducers'

export default function configureStore(initialState) {
  return createStore(rootReducer, initialState, compose(
      applyMiddleware(thunkMiddleware /* , createLogger() */)
      // window.devToolsExtension ? window.devToolsExtension() : f => f
    )
  )
}
