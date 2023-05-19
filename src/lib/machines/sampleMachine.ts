import {
  createMachine,
  type ActorRefFrom,
  spawn,
  assign,
  forwardTo,
  sendTo,
} from "xstate";
import { audioElementPlayerMachine, type PlayerEvents } from "./playerMachine";
import { saveStateMachineId } from "./saveState";

const sampleMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5SwIYFsAOAbMBlALivmAHRYD2KEAlgHZQDEACgEoCiAMgPICCAIgG0ADAF1EoDOVjV81crXEgAHogAsAJgA0IAJ6IAHAEYSAViHnzqgOwA2fQGYrhmwF8X21JhwEipClTpGdn4ATWExJBBJaVl5RRUEdXUTUxt1VQBOfSEM9RsTQ3tVbT0EQyMSDJN7Q3V7ExsM1X19arcPdGw8QmISWHxyDAxIZg4eMNFFaJk5BUiEpJSG9KycvIKiksQ69RJVatqre31VcpN9dpBPLp9e7BQdQIY2ADk+NkFJyOnYudAF5KpFbZXL5QrFXSIezqfR7IRpVQ5RFIy7Xbw9Uj3R70Bi4AAqXCY4SmUhmcXm20By0yIPW4K2CEcsIy8MWdkKQky9lRnXRvhIWKeTDGEwiElJv3iansJBsiJs9gy9iEBUM1nsDPULJIytUdiERSsqg0rkutHIEDgijR3V8JJisylCAAtDYGc6Uhkvd6fT7ue4rrzbb1-DR6PayX9lIhGiQYbUbJyWacjVYGeVdvsanUGk0Wm0AzbbqR+oNhhAI5KKQhTkISCdHCYTFYkpyTBkGdCbKZloYqlYB-olTyvMHMVgHoFK47q7H43kk5zDKnOxljMkB0b9Fr9HKTG43EA */

    tsTypes: {} as import("./sampleMachine.typegen").Typegen0,

    schema: {
      context: {} as {
        id: string;
        title: string;
        dataId: string;
        playerRef?: ActorRefFrom<typeof audioElementPlayerMachine>;
      },
      events: {} as { type: "PRELOAD"; data: Blob } | PlayerEvents<unknown>,
    },
    initial: "loading",

    states: {
      loading: {
        entry: "startPreload",
        on: {
          PRELOAD: { actions: "createBlobPlayer" },
          READY: "stopped",
        },
      },

      stopped: {
        on: {
          PLAY: { actions: "forwardToPlayer", target: "playing" },
        },
      },

      playing: {
        on: {
          ENDED: "stopped",
          STOP: { target: "stopped", actions: "forwardToPlayer" },
          PLAY: {
            actions: "forwardToPlayer",
          },
        },
      },
    },
  },
  {
    actions: {
      createBlobPlayer: assign({
        playerRef: (_, event) =>
          spawn(audioElementPlayerMachine.withContext({ srcBlob: event.data })),
      }),
      forwardToPlayer: forwardTo((context) => context.playerRef!),
      startPreload: sendTo(saveStateMachineId, (context) => ({
        type: "GET_PRELOAD",
        data: { dataId: context.dataId, reply: context.id },
      })),
    },
  }
);

export { sampleMachine };
