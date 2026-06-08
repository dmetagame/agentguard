import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { somniaTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [somniaTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [somniaTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
