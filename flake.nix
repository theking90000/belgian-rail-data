{
  description = "SNCB Insights - Belgian Rail Data analytics & tracking";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        pname = "sncb-insights";
        version = "2.0.0";
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          inherit pname version;

          src = pkgs.lib.cleanSourceWith {
            src = ./.;
            filter = path: type:
              let baseName = builtins.baseNameOf path;
              in !(builtins.elem baseName [
                "node_modules"
                "target"
                "cache"
                ".git"
                ".gitignore"
                "brd.db"
                "brd.db-shm"
                "brd.db-wal"
                "config.db"
                "data.db"
                "logs.db"
                "tracked.json"
                "flake.nix"
                "flake.lock"
                "default.nix"
                "node-env.nix"
                "node-packages.nix"
                "yarn.lock"
                "package-lock.json"
              ]);
          };

          nativeBuildInputs = with pkgs; [
            bun
            python3
            gcc
            gnumake
            pkg-config
          ];

          buildInputs = with pkgs; [
            sqlite
          ];

          npm_config_build_from_source = "true";

          dontFixup = true;

          buildPhase = ''
            runHook preBuild

            export HOME="$TMPDIR"

            echo "[flake] Installing dependencies with Bun..."
            bun install --frozen-lockfile --production

            echo "[flake] Building standalone binary..."
            bun build --compile --outfile="sncb-insights" ./src/main.ts

            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall

            mkdir -p "$out/bin"
            install -m 755 sncb-insights "$out/bin/sncb-insights"

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Belgian Rail Data analytics and tracking";
            homepage = "https://github.com/anomalyco/sncb-insights";
            license = licenses.mit;
            mainProgram = "sncb-insights";
            platforms = platforms.linux ++ platforms.darwin;
          };
        };

        packages.sncb-insights = self.packages.${system}.default;

        devShells.default = pkgs.mkShell {
          name = "${pname}-devshell";

          nativeBuildInputs = with pkgs; [
            gcc
            python3
            pkg-config
            gnumake
          ];

          packages = with pkgs; [
            bun
            sqlite
          ];

          npm_config_build_from_source = "true";

          shellHook = ''
            echo "=== SNCB Insights Development Shell ==="
            echo "  bun install    - install dependencies"
            echo "  bun run start  - run the application"
            echo "  bun build --compile ...  - compile to standalone binary"
            echo "  nix build .#   - build the Nix package"
          '';
        };

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/sncb-insights";
        };

        apps.sncb-insights = self.apps.${system}.default;
      }
    );
}
