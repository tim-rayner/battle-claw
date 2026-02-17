import chalk from 'chalk';
import { ApiClient } from '../lib/api-client';
import { Analyzer } from '../lib/analyzer';
import { OutputRenderer } from '../lib/output-renderer';
import { ContextBuilder } from '../lib/context-builder';
import { parsePlayerNames, validateMatchCount, validatePlatform } from '../utils/validators';

interface AnalyzeCommandOptions {
  players: string;
  matches: number;
  mode?: string;
  platform: string;
  output: 'table' | 'json' | 'context';
  verbose: boolean;
  noTelemetry: boolean;
}

export async function runAnalyze(
  api: ApiClient,
  opts: AnalyzeCommandOptions
): Promise<void> {
  // Validate inputs
  const playerNames = parsePlayerNames(opts.players);
  if (playerNames.length === 0) {
    console.error(chalk.red('Error: No valid player names provided.'));
    process.exit(1);
  }
  if (playerNames.length > 4) {
    console.error(chalk.red('Error: Maximum 4 players (squad size).'));
    process.exit(1);
  }

  const platform = opts.platform.toLowerCase();
  if (!validatePlatform(platform)) {
    console.error(chalk.red(`Error: Invalid platform "${platform}". Use: steam, kakao, psn, xbox`));
    process.exit(1);
  }

  const matchCount = validateMatchCount(Number(opts.matches));

  const isSilent = opts.output === 'json' || opts.output === 'context';
  const log = isSilent
    ? (_msg: string) => {}
    : (msg: string) => console.log(chalk.gray(`  ${msg}`));

  const analyzer = new Analyzer(api);

  try {
    const analysis = await analyzer.analyze(
      {
        players: playerNames,
        matchCount,
        platform,
        gameMode: opts.mode,
        fetchTelemetry: !opts.noTelemetry,
      },
      log
    );

    if (opts.output === 'json') {
      const renderer = new OutputRenderer();
      renderer.renderJSON(analysis);
    } else if (opts.output === 'context') {
      const builder = new ContextBuilder();
      console.log(builder.buildMarkdown(analysis));
    } else {
      const renderer = new OutputRenderer();
      if (opts.verbose) {
        renderer.renderVerbose(analysis);
      } else {
        renderer.renderTable(analysis);
      }
    }
  } catch (err) {
    handleError(err);
  }
}

function handleError(error: unknown): never {
  if (error instanceof Error) {
    const apiError = error as Error & { statusCode?: number };

    if (apiError.statusCode === 401) {
      console.error(chalk.red('\n❌ Authentication failed'));
      console.log(chalk.yellow('💡 Make sure PUBG_API_KEY is set in your .env file'));
      console.log(chalk.blue('   Get your API key at: https://developer.pubg.com'));
    } else if (apiError.statusCode === 404) {
      console.error(chalk.red('\n❌ Player or match not found'));
      console.log(chalk.yellow('💡 Check player names for typos'));
      console.log(chalk.yellow('💡 Matches older than 14 days are not available'));
    } else if (apiError.statusCode === 429) {
      console.error(chalk.red('\n❌ Rate limit exceeded'));
      console.log(chalk.yellow('💡 Wait 60 seconds and try again'));
    } else {
      console.error(chalk.red(`\n❌ ${error.message}`));
    }
  } else {
    console.error(chalk.red('\n❌ An unexpected error occurred'));
  }
  process.exit(1);
}
