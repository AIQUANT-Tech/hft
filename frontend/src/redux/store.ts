import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import walletReducer from "./walletSlice";
import tokensReducer from "./tokensSlice";
import priceReducer from "./priceSlice";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import themeReducer from "./themeSlice";
import dashboardReducer from "./dashboardSlice";
import storage from "redux-persist/lib/storage";
import storageSession from "redux-persist/lib/storage/session";
import authReducer from "./authSlice";

// Wallet persist config
const walletPersistConfig = {
  key: "wallet",
  storage: storageSession,
  whitelist: ["walletId", "walletAddress"],
};

// Tokens persist config
const tokensPersistConfig = {
  key: "tokens",
  storage: storage,
  whitelist: ["tokens", "lastFetchTime"],
  blacklist: ["loading", "error"],
};

const persistedWalletReducer = persistReducer(
  walletPersistConfig,
  walletReducer
);
const persistedTokensReducer = persistReducer(
  tokensPersistConfig,
  tokensReducer
);

const rootReducer = combineReducers({
  wallet: persistedWalletReducer,
  tokens: persistedTokensReducer,
  price: priceReducer,
  theme: themeReducer,
  auth: authReducer,
  dashboard: dashboardReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ✅ Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const persistor = persistStore(store);
