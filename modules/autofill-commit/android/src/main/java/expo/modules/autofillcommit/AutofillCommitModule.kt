package expo.modules.autofillcommit

import android.os.Build
import android.view.autofill.AutofillManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * React Native resta in un'unica Activity: cambiando schermata la sessione di Autofill
 * non si chiude da sola e Android non propone mai "Salvare la password?".
 * `commit()` chiude la sessione e fa partire la richiesta di salvataggio.
 */
class AutofillCommitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AutofillCommit")

    Function("commit") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        appContext.currentActivity
          ?.getSystemService(AutofillManager::class.java)
          ?.commit()
      }
    }
  }
}
