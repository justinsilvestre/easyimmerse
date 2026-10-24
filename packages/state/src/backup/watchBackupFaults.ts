import { actions } from "../app/appAction.ts";
import type { AppStore } from "../app/createAppStore.ts";
import { backupFaultNotice } from "./backupFaultNotice.ts";
import { selectBackupSign } from "./selectBackupSign.ts";

/**
 * Shows a notice each time the backup breaks, for as long as the store lives.
 * It watches the store rather than its actions, since the server's status answers, which may break the backup, pass the app's update by.
 */
export function watchBackupFaults(store: AppStore): void {
  let shownSign = selectBackupSign(store.getState());
  store.subscribe(() => {
    const sign = selectBackupSign(store.getState());
    const notice = backupFaultNotice(shownSign, sign);
    shownSign = sign;
    if (notice !== null) store.dispatch(actions.noticeRequested(notice));
  });
}
