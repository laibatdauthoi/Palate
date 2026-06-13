module palate::palate {
    /// Task 1 scaffold only. Business logic will be added in later tasks.
    const E_NOT_IMPLEMENTED: u64 = 0;

    /// Category values.
    const CATEGORY_MEME: u8 = 1;
    const CATEGORY_IMAGE: u8 = 2;

    /// Media status values.
    const STATUS_IDLE: u8 = 1;
    const STATUS_WAITING: u8 = 2;
    const STATUS_ACTIVE: u8 = 3;
    const STATUS_SETTLED: u8 = 4;
    const STATUS_DISABLED: u8 = 5;
    const STATUS_BANNED: u8 = 6;

    /// Match status values.
    const MATCH_STATUS_ACTIVE: u8 = 1;
    const MATCH_STATUS_SETTLED: u8 = 2;

    /// Waiting push status values.
    const WAITING_PUSH_STATUS_OPEN: u8 = 1;
    const WAITING_PUSH_STATUS_CANCELLED: u8 = 2;
    const WAITING_PUSH_STATUS_CHALLENGED: u8 = 3;

    /// Side values.
    const SIDE_A: u8 = 1;
    const SIDE_B: u8 = 2;

    /// Score algorithm values.
    const SCORE_ALGORITHM_LOG: u8 = 1;

    /// Default protocol parameters for Aptos testnet MVP initialization.
    const DEFAULT_PROTOCOL_FEE_BPS: u64 = 500;
    const DEFAULT_MIN_PUSH_AMOUNT: u64 = 100000000;
    const DEFAULT_MIN_BUFF_AMOUNT: u64 = 10000000;
    const DEFAULT_MIN_PUSH_INCREMENT_BPS: u64 = 500;
    const DEFAULT_MATCH_DURATION_SECONDS: u64 = 86400;
    const DEFAULT_BUFF_COMMITMENT_AMOUNT: u64 = 50000000;
    const DEFAULT_SKIP_PENALTY_AMOUNT: u64 = 50000000;
    const DEFAULT_RANDOM_RETRY_COUNT: u64 = 10;
    const DEFAULT_SCORE_ALGORITHM_TYPE: u8 = SCORE_ALGORITHM_LOG;
    const DEFAULT_SCORE_SCALE: u64 = 1000000;
    const DEFAULT_SCORE_LOG_BASE: u64 = 2;

    /// Spec name: media_record. Move requires struct names to start uppercase.
    struct MediaRecord has copy, drop, store {
        media_id: u64,
        owner: address,
        category: u8,
        shelby_blob_ref: vector<u8>,
        content_hash: vector<u8>,
        mime_type: vector<u8>,
        title: vector<u8>,
        created_time: u64,
        status: u8,
    }

    /// Spec name: waiting_push. Move requires struct names to start uppercase.
    struct WaitingPush has copy, drop, store {
        push_id: u64,
        media_id: u64,
        pusher: address,
        category: u8,
        push_amount: u64,
        created_time: u64,
        status: u8,
    }

    /// Spec name: active_match. Move requires struct names to start uppercase.
    struct ActiveMatch has copy, drop, store {
        match_id: u64,
        media_a_id: u64,
        media_b_id: u64,
        pusher_a: address,
        pusher_b: address,
        push_amount_a: u64,
        push_amount_b: u64,
        category: u8,
        start_time: u64,
        end_time: u64,
        buff_pool_a: u64,
        buff_pool_b: u64,
        score_a: u64,
        score_b: u64,
        buff_count_a: u64,
        buff_count_b: u64,
        status: u8,
    }

    /// Spec name: buff_record. Move requires struct names to start uppercase.
    struct BuffRecord has copy, drop, store {
        match_id: u64,
        user: address,
        side: u8,
        buff_amount: u64,
        score: u64,
        claimed: bool,
    }

    /// Spec name: user_assignment. Move requires struct names to start uppercase.
    struct UserAssignment has copy, drop, store {
        user: address,
        match_id: u64,
        commitment_amount: u64,
        assigned_time: u64,
    }

    /// Spec name: user_summary. Move requires struct names to start uppercase.
    struct UserSummary has copy, drop, store {
        push_count: u64,
        push_win_count: u64,
        push_loss_count: u64,
        push_profit: u64,
        buff_count: u64,
        buff_win_count: u64,
        buff_loss_count: u64,
        buff_profit: u64,
        total_pushed: u64,
        total_buffed: u64,
        claimable_amount: u64,
    }

    /// Spec name: protocol_config. Move requires struct names to start uppercase.
    struct ProtocolConfig has copy, drop, store {
        protocol_fee_bps: u64,
        min_push_amount: u64,
        min_buff_amount: u64,
        min_push_increment_bps: u64,
        match_duration_seconds: u64,
        buff_commitment_amount: u64,
        skip_penalty_amount: u64,
        random_retry_count: u64,
        score_algorithm_type: u8,
        score_scale: u64,
        score_log_base: u64,
        treasury_address: address,
        admin_address: address,
    }

    public entry fun registerMedia(
        _account: &signer,
        _category: u8,
        _shelby_blob_ref: vector<u8>,
        _content_hash: vector<u8>,
        _mime_type: vector<u8>,
        _title: vector<u8>,
    ) {
        abort E_NOT_IMPLEMENTED
    }

    public fun getUserMedia(_owner: address): vector<u64> {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun createPush(_account: &signer, _media_id: u64, _push_amount: u64) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun cancelPush(_account: &signer, _push_id: u64) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun challengePush(
        _account: &signer,
        _push_id: u64,
        _challenger_media_id: u64,
        _push_amount: u64,
    ) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun findMatch(_account: &signer) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun skipMatch(_account: &signer) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun placeBuff(_account: &signer, _side: u8, _buff_amount: u64) {
        abort E_NOT_IMPLEMENTED
    }

    public fun calculateBuffScore(_buff_amount: u64, _config: &ProtocolConfig): u64 {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun settleMatch(_account: &signer, _match_id: u64) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun claimPush(_account: &signer, _match_id: u64) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun claimBuff(_account: &signer, _match_id: u64) {
        abort E_NOT_IMPLEMENTED
    }

    public fun getUserSummary(_owner: address): UserSummary {
        abort E_NOT_IMPLEMENTED
    }

    public fun getMatch(_match_id: u64): ActiveMatch {
        abort E_NOT_IMPLEMENTED
    }

    public fun getWaitingPushes(): vector<u64> {
        abort E_NOT_IMPLEMENTED
    }

    public fun getActiveMatches(): vector<u64> {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun updateFeeConfig(
        _account: &signer,
        _protocol_fee_bps: u64,
        _treasury_address: address,
    ) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun updatePushConfig(
        _account: &signer,
        _min_push_amount: u64,
        _min_push_increment_bps: u64,
    ) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun updateBuffConfig(
        _account: &signer,
        _min_buff_amount: u64,
        _buff_commitment_amount: u64,
        _skip_penalty_amount: u64,
    ) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun updateMatchConfig(
        _account: &signer,
        _match_duration_seconds: u64,
        _random_retry_count: u64,
    ) {
        abort E_NOT_IMPLEMENTED
    }

    public entry fun updateScoreConfig(
        _account: &signer,
        _score_algorithm_type: u8,
        _score_scale: u64,
        _score_log_base: u64,
    ) {
        abort E_NOT_IMPLEMENTED
    }
}
