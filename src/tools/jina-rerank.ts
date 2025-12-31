import { TokenTracker } from "../utils/token-tracker";
import { JINA_API_KEY, JINA_RERANK_BASE_URL, JINA_RERANK_MODEL } from "../config";
import axiosClient from '../utils/axios-client';
import { logInfo, logError, logDebug, logWarning } from '../logging';

// Types for Jina Rerank API
interface JinaRerankRequest {
  model: string;
  query: string;
  top_n: number;
  documents: string[];
}

interface JinaRerankResponse {
  model: string;
  results: Array<{
    index: number;
    document: {
      text: string;
    };
    relevance_score: number;
  }>;
  usage: {
    total_tokens: number;
  };
}

export async function rerankDocuments(
  query: string,
  documents: string[],
  tracker?: TokenTracker,
  batchSize = 2000
): Promise<{ results: Array<{ index: number, relevance_score: number, document: { text: string } }> }> {
  try {
    if (!JINA_API_KEY) {
      throw new Error('JINA_API_KEY is not set');
    }

    // No need to slice - we'll process all documents in batches
    const batches: string[][] = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    logDebug(`Reranking ${documents.length} documents in ${batches.length} batches`);

    // Process all batches in parallel
    const batchResults = await Promise.all(
      batches.map(async (batchDocuments, batchIndex) => {
        const startIdx = batchIndex * batchSize;

        const request: JinaRerankRequest = {
          model: JINA_RERANK_MODEL,
          query,
          top_n: batchDocuments.length,
          documents: batchDocuments
        };

        const response = await axiosClient.post<JinaRerankResponse>(
          JINA_RERANK_BASE_URL,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${JINA_API_KEY}`
            }
          }
        );

        // Track token usage from this batch
        (tracker || new TokenTracker()).trackUsage('rerank', {
          promptTokens: response.data.usage.total_tokens,
          completionTokens: 0,
          totalTokens: response.data.usage.total_tokens
        });

        // Add the original document index to each result
        return response.data.results.map(result => ({
          ...result,
          originalIndex: startIdx + result.index // Map back to the original index
        }));
      })
    );

    // Flatten and sort all results by relevance score
    const allResults = batchResults.flat().sort((a, b) => b.relevance_score - a.relevance_score);

    // Keep the original document indices in the results
    const finalResults = allResults.map(result => ({
      index: result.originalIndex,       // Original document index
      relevance_score: result.relevance_score,
      document: result.document
    }));

    return { results: finalResults };
  } catch (error) {
    logError('Reranking error:', { error });

    // Return empty results if there is an error
    return {
      results: []
    };
  }
}