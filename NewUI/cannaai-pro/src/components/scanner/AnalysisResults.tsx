import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, CheckCircle, Clock, ChevronDown,
  Brain, Bug, FlaskConical, Thermometer, Wind, Droplets,
  FileText, Download, RefreshCw, Eye, Zap, TrendingUp
} from 'lucide-react';
import { PlantAnalysis } from '../../types/scanner';
import { getSeverityColorClasses, getUrgencyColorClasses, downloadReport } from '../../lib/scanner-utils';

interface AnalysisResultsProps {
  analysis: PlantAnalysis | null;
  formData?: any;
  isProcessing?: boolean;
  onReanalyze?: () => void;
  onDownloadReport?: () => void;
  className?: string;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  formData,
  isProcessing = false,
  onReanalyze,
  onDownloadReport,
  className = ''
}) => {
  if (isProcessing) {
    return (
      <div className={`bg-[#181b21] rounded-xl border border-gray-800 p-8 text-center ${className}`}>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Brain className="w-16 h-16 text-emerald-500" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Analyzing Plant Health</h3>
            <p className="text-sm text-gray-400">AI is processing your plant data...</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`bg-[#181b21] rounded-xl border border-gray-800 p-8 text-center ${className}`}>
        <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Analysis Yet</h3>
        <p className="text-sm text-gray-400">Upload an image and provide plant information to see detailed analysis results</p>
      </div>
    );
  }

  const severityColors = getSeverityColorClasses(analysis.severity);
  const urgencyColors = getUrgencyColorClasses(analysis.urgency);

  return (
    <div className={`bg-[#181b21] rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h3 className="text-xl font-semibold text-white">Analysis Results</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                analysis.healthScore > 70 ? "text-emerald-400" :
                analysis.healthScore > 40 ? "text-amber-400" : "text-red-400"
              }`}>
                {analysis.healthScore}%
              </div>
              <div className="text-xs text-gray-500 uppercase font-medium tracking-wider">Health Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Diagnosis Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Primary Diagnosis</h4>
            <p className="text-white font-medium">{analysis.diagnosis}</p>
            {analysis.scientificName && (
              <p className="text-sm text-gray-500 italic mt-1">{analysis.scientificName}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Confidence</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analysis.confidence}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400 w-12 text-right">{analysis.confidence}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Severity</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors.text} ${severityColors.bg} ${severityColors.border} border`}>
                {analysis.severity}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Urgency</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${urgencyColors.text} ${urgencyColors.bg} ${urgencyColors.border} border`}>
                {analysis.urgency}
              </span>
            </div>
          </div>
        </div>

        {/* Purple Strain Analysis */}
        {analysis.purpleAnalysis && (
          <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
            <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Purple Strain Analysis
            </h4>
            <p className="text-sm text-purple-200">
              {analysis.purpleAnalysis.analysis}
            </p>
            {analysis.purpleAnalysis.isGenetic && (
              <p className="text-xs text-purple-300 mt-2">
                This appears to be genetic purple coloration, which is normal for this strain.
              </p>
            )}
          </div>
        )}

        {/* Key Findings */}
        {analysis.symptomsMatched && analysis.symptomsMatched.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Identified Symptoms
            </h4>
            <div className="space-y-2">
              {analysis.symptomsMatched.slice(0, 5).map((symptom, i) => (
                <div key={i} className="flex items-start text-sm text-gray-300">
                  <span className="mr-2 text-emerald-500 mt-0.5">•</span>
                  {symptom}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Root Causes */}
        {analysis.causes && analysis.causes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
              Potential Causes
            </h4>
            <div className="space-y-2">
              {analysis.causes.slice(0, 3).map((cause, i) => (
                <div key={i} className="flex items-start text-sm text-gray-300">
                  <span className="mr-2 text-amber-500 mt-0.5">•</span>
                  {cause}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Analysis Accordion */}
        {analysis.reasoning && analysis.reasoning.length > 0 && (
          <details className="group">
            <summary className="flex items-center justify-between p-3 cursor-pointer list-none text-sm font-medium text-gray-400 group-hover:text-gray-300 bg-gray-800/30 rounded-lg">
              <span className="flex items-center">
                <Brain className="w-4 h-4 mr-2" />
                View Analysis Reasoning
              </span>
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="p-4 pt-0 space-y-3">
              {analysis.reasoning.map((step, i) => (
                <div key={i} className="border-l-2 border-emerald-500/30 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-gray-300">{step.step}</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                      {step.weight}% weight
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{step.explanation}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Pests and Diseases */}
        {(analysis.pestsDetected?.length || analysis.diseasesDetected?.length) && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <Bug className="w-4 h-4 mr-2 text-red-400" />
              Pests & Diseases Detected
            </h4>

            {analysis.pestsDetected && analysis.pestsDetected.length > 0 && (
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">Pests</h5>
                <div className="space-y-2">
                  {analysis.pestsDetected.map((pest, i) => (
                    <div key={i} className="bg-red-900/20 rounded-lg p-3 border border-red-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-red-300">{pest.name}</span>
                        {pest.scientificName && (
                          <span className="text-xs text-red-400 italic">{pest.scientificName}</span>
                        )}
                      </div>
                      <p className="text-xs text-red-200">{pest.treatment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.diseasesDetected && analysis.diseasesDetected.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-orange-400 uppercase mb-2">Diseases</h5>
                <div className="space-y-2">
                  {analysis.diseasesDetected.map((disease, i) => (
                    <div key={i} className="bg-orange-900/20 rounded-lg p-3 border border-orange-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-orange-300">{disease.name}</span>
                        {disease.pathogen && (
                          <span className="text-xs text-orange-400 italic">{disease.pathogen}</span>
                        )}
                      </div>
                      <p className="text-xs text-orange-200">{disease.treatment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nutrient Deficiencies */}
        {analysis.nutrientDeficiencies && analysis.nutrientDeficiencies.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <FlaskConical className="w-4 h-4 mr-2 text-blue-400" />
              Nutrient Deficiencies
            </h4>
            <div className="space-y-2">
              {analysis.nutrientDeficiencies.map((deficiency, i) => (
                <div key={i} className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-300">{deficiency.nutrient}</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {deficiency.severity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-200 mb-2">
                    {deficiency.currentLevel && (
                      <div>
                        <span className="text-blue-400">Current:</span> {deficiency.currentLevel}
                      </div>
                    )}
                    {deficiency.optimalLevel && (
                      <div>
                        <span className="text-blue-400">Optimal:</span> {deficiency.optimalLevel}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-200">{deficiency.treatment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environmental Factors */}
        {analysis.environmentalFactors && analysis.environmentalFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <Thermometer className="w-4 h-4 mr-2 text-yellow-400" />
              Environmental Factors
            </h4>
            <div className="space-y-2">
              {analysis.environmentalFactors.map((factor, i) => (
                <div key={i} className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-yellow-300">{factor.factor}</span>
                    <Wind className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-xs text-yellow-200">
                    <p>{factor.correction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treatment Recommendations */}
        {analysis.recommendations && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Treatment Timeline
            </h4>

            <div className="space-y-4">
              {analysis.recommendations.immediate && analysis.recommendations.immediate.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">Immediate Actions (24 hours)</h5>
                  <div className="space-y-1">
                    {analysis.recommendations.immediate.map((action, i) => (
                      <div key={i} className="flex items-start text-sm text-gray-300">
                        <span className="mr-2 text-red-500 mt-0.5">•</span>
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recommendations.shortTerm && analysis.recommendations.shortTerm.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-amber-400 uppercase mb-2">Short Term (1-2 weeks)</h5>
                  <div className="space-y-1">
                    {analysis.recommendations.shortTerm.map((action, i) => (
                      <div key={i} className="flex items-start text-sm text-gray-300">
                        <span className="mr-2 text-amber-500 mt-0.5">•</span>
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recommendations.longTerm && analysis.recommendations.longTerm.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-blue-400 uppercase mb-2">Long Term (Ongoing)</h5>
                  <div className="space-y-1">
                    {analysis.recommendations.longTerm.map((action, i) => (
                      <div key={i} className="flex items-start text-sm text-gray-300">
                        <span className="mr-2 text-blue-500 mt-0.5">•</span>
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prognosis and Follow-up */}
        {(analysis.prognosis || analysis.followUpSchedule) && (
          <div className="bg-gray-800/30 rounded-lg p-4">
            {analysis.prognosis && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Prognosis</h4>
                <p className="text-sm text-gray-300">{analysis.prognosis}</p>
              </div>
            )}

            {analysis.followUpSchedule && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Follow-up Schedule</h4>
                <p className="text-sm text-gray-300">{analysis.followUpSchedule}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Download Report
            </button>
          )}

          {onReanalyze && (
            <button
              onClick={onReanalyze}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Re-analyze
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;