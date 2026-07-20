const { createRunOncePlugin, withAppBuildGradle } = require("expo/config-plugins");

const EXCLUDE_BROTLI_DEC_MARKER = "codex-relay:exclude-org-brotli-dec";

const EXCLUDE_BROTLI_DEC_BLOCK = `
// ${EXCLUDE_BROTLI_DEC_MARKER}
// @hot-updater/react-native ships org.brotli.dec 1.2.0 as a local JAR.
// Expo also depends on Maven Central org.brotli:dec:0.1.2, which collides at
// :app:checkReleaseDuplicateClasses. Prefer hot-updater's patched JAR.
configurations.configureEach {
    exclude group: "org.brotli", module: "dec"
}
`;

/**
 * Exclude the vulnerable Maven Central brotli decoder so it does not
 * duplicate classes with hot-updater's bundled org.brotli.dec-1.2.0.jar.
 */
function withExcludeBrotliDec(config) {
  return withAppBuildGradle(config, (configWithGradle) => {
    if (configWithGradle.modResults.language !== "groovy") {
      throw new Error(
        "withExcludeBrotliDec: only groovy app/build.gradle is supported",
      );
    }

    const buildGradleContents = configWithGradle.modResults.contents;
    if (buildGradleContents.includes(EXCLUDE_BROTLI_DEC_MARKER)) {
      return configWithGradle;
    }

    if (buildGradleContents.includes("dependencies {")) {
      configWithGradle.modResults.contents = buildGradleContents.replace(
        "dependencies {",
        `${EXCLUDE_BROTLI_DEC_BLOCK}\ndependencies {`,
      );
      return configWithGradle;
    }

    configWithGradle.modResults.contents = `${buildGradleContents}\n${EXCLUDE_BROTLI_DEC_BLOCK}\n`;
    return configWithGradle;
  });
}

module.exports = createRunOncePlugin(
  withExcludeBrotliDec,
  "withExcludeBrotliDec",
  "1.0.0",
);
