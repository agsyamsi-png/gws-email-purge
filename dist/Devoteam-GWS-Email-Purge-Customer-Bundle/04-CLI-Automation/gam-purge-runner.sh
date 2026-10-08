#!/usr/bin/env bash
# ==============================================================================
# Enterprise Google Workspace Email Purge Execution Runner (GAM / GAMADV-XTD3)
# Devoteam G Cloud - Cloud Architecture & SecOps Delivery Standards
# ==============================================================================
# Usage:
#   ./gam-purge-runner.sh --query 'from:bad@evil.com subject:"Invoice"' --mode trash
#   ./gam-purge-runner.sh --query 'rfc822msgid:<...>' --mode delete --sheet-id "<SPREADSHEET_ID>"
#   ./gam-purge-runner.sh --query 'from:spammer@evil.com' --csv target_mailboxes.csv --mode dry-run
# ==============================================================================

set -euo pipefail

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default settings
MODE="dry-run"
SCOPE="all"
QUERY=""
SHEET_ID=""
SHEET_NAME="Target_Mailboxes"
CSV_FILE=""
SINGLE_USER=""
OU=""
GROUP=""
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
LOG_DIR="./purge_logs"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/purge_${INCIDENT_ID}.log"

# Helper print functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "${LOG_FILE}"
}
log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "${LOG_FILE}"
}
log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "${LOG_FILE}"
}
log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "${LOG_FILE}"
}

print_banner() {
    echo -e "${BOLD}${BLUE}"
    echo "=================================================================="
    echo "  🚀 GOOGLE WORKSPACE EMAIL PURGE RUNNER (GAM / GAMADV-XTD3)     "
    echo "  Devoteam G Cloud Enterprise Standards                           "
    echo "=================================================================="
    echo -e "${NC}"
}

usage() {
    echo -e "${BOLD}Usage:${NC} $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -q, --query <QUERY>          Gmail RFC 822 search query (e.g. 'from:bad@evil.com')"
    echo "  -m, --mode <MODE>            Purge action: dry-run, trash (recommended), delete"
    echo "                               Default: dry-run"
    echo "  -s, --scope <SCOPE>          Target scope: all, sheet, csv, user, ou, group"
    echo "                               Default: all"
    echo "      --sheet-id <ID>          Google Sheet ID (when scope is 'sheet')"
    echo "      --sheet-name <NAME>      Sheet tab name (Default: Target_Mailboxes)"
    echo "      --csv <PATH>             Path to CSV file with 'Email' header (when scope is 'csv')"
    echo "      --user <EMAIL>           Single user email address"
    echo "      --ou <PATH>              Organizational Unit path (e.g. '/Finance')"
    echo "      --group <EMAIL>          Google Group email address"
    echo "      --incident-id <ID>       Incident or ticket identifier"
    echo "  -h, --help                   Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -q 'rfc822msgid:<abc@evil.com>' --mode dry-run"
    echo "  $0 -q 'from:phish@attacker.com' --scope sheet --sheet-id '1A2B3C...'"
    echo "  $0 -q 'subject:\"Phishing Alert\"' --scope user --user 'victim@domain.com' --mode trash"
    exit "${1:-0}"
}

# Parse Command Line Arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -q|--query)
            QUERY="$2"; shift 2 ;;
        -m|--mode)
            MODE="$2"; shift 2 ;;
        -s|--scope)
            SCOPE="$2"; shift 2 ;;
        --sheet-id)
            SHEET_ID="$2"; shift 2 ;;
        --sheet-name)
            SHEET_NAME="$2"; shift 2 ;;
        --csv)
            CSV_FILE="$2"; shift 2 ;;
        --user)
            SINGLE_USER="$2"; shift 2 ;;
        --ou)
            OU="$2"; shift 2 ;;
        --group)
            GROUP="$2"; shift 2 ;;
        --incident-id)
            INCIDENT_ID="$2"; shift 2 ;;
        -h|--help)
            usage 0 ;;
        *)
            log_error "Unknown argument: $1"
            usage 1 ;;
    esac
done

print_banner

# Step 0: Pre-Flight Check - GAM Installation & Domain Check
log_info "Running pre-flight checks..."
if ! command -v gam &> /dev/null; then
    log_error "GAM executable not found in PATH."
    log_error "Please ensure GAM or GAMADV-XTD3 is installed and added to PATH."
    exit 1
fi

GAM_VER=$(gam version | head -n 1)
log_info "Detected GAM Version: ${GAM_VER}"

# Step 1: Query Safety Validation
if [[ -z "${QUERY}" ]]; then
    log_error "Search query (--query) is required."
    usage 1
fi

# Check for catastrophic empty/broad patterns
TRIMMED_QUERY=$(echo "${QUERY}" | tr '[:upper:]' '[:lower:]' | xargs)
if [[ "${TRIMMED_QUERY}" == "*" || "${TRIMMED_QUERY}" == "\"\"" || "${TRIMMED_QUERY}" == "is:unread" || "${TRIMMED_QUERY}" == "is:read" || "${TRIMMED_QUERY}" == "label:inbox" ]]; then
    log_error "Catastrophic query pattern detected: '${QUERY}'. Execution terminated for domain safety."
    exit 2
fi

log_info "Incident Reference : ${INCIDENT_ID}"
log_info "Gmail Search Query : \"${QUERY}\""
log_info "Target Scope       : ${SCOPE}"
log_info "Purge Mode         : ${MODE^^}"

# Step 2: Build Base Target Command
GAM_TARGET_PREFIX=""
case "${SCOPE}" in
    all)
        GAM_TARGET_PREFIX="all users"
        ;;
    sheet)
        if [[ -z "${SHEET_ID}" ]]; then
            log_error "When --scope is 'sheet', --sheet-id must be provided."
            exit 1
        fi
        GAM_TARGET_PREFIX="csv gsheet \"${SHEET_ID}\" \"${SHEET_NAME}\" gam user ~Email"
        ;;
    csv)
        if [[ -z "${CSV_FILE}" || ! -f "${CSV_FILE}" ]]; then
            log_error "CSV file not found at: '${CSV_FILE}'"
            exit 1
        fi
        GAM_TARGET_PREFIX="csv \"${CSV_FILE}\" gam user ~Email"
        ;;
    user)
        if [[ -z "${SINGLE_USER}" ]]; then
            log_error "When --scope is 'user', --user <email> must be provided."
            exit 1
        fi
        GAM_TARGET_PREFIX="user \"${SINGLE_USER}\""
        ;;
    ou)
        if [[ -z "${OU}" ]]; then
            log_error "When --scope is 'ou', --ou <path> must be provided."
            exit 1
        fi
        GAM_TARGET_PREFIX="ou \"${OU}\""
        ;;
    group)
        if [[ -z "${GROUP}" ]]; then
            log_error "When --scope is 'group', --group <email> must be provided."
            exit 1
        fi
        GAM_TARGET_PREFIX="group \"${GROUP}\""
        ;;
    *)
        log_error "Invalid scope: ${SCOPE}. Must be one of: all, sheet, csv, user, ou, group."
        exit 1
        ;;
esac

# Step 3: Simulation / Dry-Run (Always Run First)
log_info "Executing Phase 1: Dry-Run Discovery & Blast-Radius Calculation..."
SCAN_OUTPUT="${LOG_DIR}/scan_${INCIDENT_ID}.csv"

# Command for dry-run message search
SCAN_CMD="gam ${GAM_TARGET_PREFIX} print messages query \"${QUERY}\""
log_info "Running: ${SCAN_CMD}"

# Execute dry-run and save output
eval "${SCAN_CMD}" > "${SCAN_OUTPUT}" 2>&1 || true

# Count matching messages
MATCH_COUNT=0
if [[ -f "${SCAN_OUTPUT}" ]]; then
    # In GAM print messages, CSV headers include 'messageId'
    MATCH_COUNT=$(grep -c -v "^User,\|^messageId\|^headers" "${SCAN_OUTPUT}" 2>/dev/null || echo 0)
    # Ensure positive integer
    if [[ "${MATCH_COUNT}" -lt 0 ]]; then MATCH_COUNT=0; fi
fi

echo ""
echo -e "${BOLD}==========================================================${NC}"
echo -e "${BOLD}📊 BLAST RADIUS IMPACT REPORT${NC}"
echo -e "Matching Message Records Found : ${BOLD}${YELLOW}${MATCH_COUNT}${NC}"
echo -e "Detailed Scan Artifact Location: ${SCAN_OUTPUT}"
echo -e "${BOLD}==========================================================${NC}"
echo ""

if [[ "${MODE}" == "dry-run" ]]; then
    log_success "Dry-run simulation completed. No mailbox changes were applied."
    exit 0
fi

if [[ "${MATCH_COUNT}" -eq 0 ]]; then
    log_warn "No matching messages discovered. Nothing to purge."
    exit 0
fi

# Step 4: Interactive Confirmation Guardrail
echo -e "${RED}${BOLD}⚠️  WARNING: DESTRUCTIVE ACTION REQUESTED${NC}"
echo -e "You are about to execute: ${BOLD}${MODE^^}${NC} on ${BOLD}${MATCH_COUNT}${NC} matching message(s)."
if [[ "${MODE}" == "delete" ]]; then
    echo -e "${RED}${BOLD}PERMANENT DELETE expunges emails directly from mailboxes!${NC}"
else
    echo -e "${YELLOW}TRASH moves emails to users' Trash folders (30-day recovery window).${NC}"
fi
echo ""
read -r -p "Type 'CONFIRM' to proceed with ${MODE^^} operation: " CONFIRMATION

if [[ "${CONFIRMATION}" != "CONFIRM" ]]; then
    log_warn "Purge operation aborted by operator. Confirmation string mismatch."
    exit 0
fi

# Step 5: Execute Purge Action
log_info "Executing Phase 2: Purge Execution (${MODE^^})..."

ACTION_CMD=""
if [[ "${MODE}" == "trash" ]]; then
    ACTION_CMD="gam ${GAM_TARGET_PREFIX} trash messages query \"${QUERY}\" doit"
elif [[ "${MODE}" == "delete" ]]; then
    ACTION_CMD="gam ${GAM_TARGET_PREFIX} delete messages query \"${QUERY}\" doit"
else
    log_error "Unsupported mode: ${MODE}"
    exit 1
fi

log_info "Executing: ${ACTION_CMD}"
eval "${ACTION_CMD}" 2>&1 | tee -a "${LOG_FILE}"

log_success "Email purge operation completed successfully!"
log_info "Audit log stored at: ${LOG_FILE}"
