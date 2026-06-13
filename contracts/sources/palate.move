module palate::palate {
    use std::signer;
    use std::vector;

    /// Task scaffold only for functions outside Task 2.
    const E_NOT_IMPLEMENTED: u64 = 0;
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_INVALID_CATEGORY: u64 = 3;
    const E_MEDIA_NOT_FOUND: u64 = 4;
    const E_NOT_MODULE_PUBLISHER: u64 = 5;

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

    struct PalateState has key {
        protocol_config: ProtocolConfig,
        media_records: vector<MediaRecord>,
        user_media_indices: vector<UserMediaIndex>,
        user_summaries: vector<UserSummaryRecord>,
        next_media_id: u64,
    }

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

    struct UserMediaIndex has copy, drop, store {
        owner: address,
        media_ids: vector<u64>,
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

    struct UserSummaryRecord has copy, drop, store {
        owner: address,
        summary: UserSummary,
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

    public entry fun initialize(account: &signer, treasury_address: address) {
        initializeInternal(account, treasury_address)
    }

    fun initializeInternal(account: &signer, treasury_address: address) {
        let admin_address = signer::address_of(account);
        assert!(admin_address == @palate, E_NOT_MODULE_PUBLISHER);
        assert!(!exists<PalateState>(@palate), E_ALREADY_INITIALIZED);

        move_to(account, PalateState {
            protocol_config: ProtocolConfig {
                protocol_fee_bps: DEFAULT_PROTOCOL_FEE_BPS,
                min_push_amount: DEFAULT_MIN_PUSH_AMOUNT,
                min_buff_amount: DEFAULT_MIN_BUFF_AMOUNT,
                min_push_increment_bps: DEFAULT_MIN_PUSH_INCREMENT_BPS,
                match_duration_seconds: DEFAULT_MATCH_DURATION_SECONDS,
                buff_commitment_amount: DEFAULT_BUFF_COMMITMENT_AMOUNT,
                skip_penalty_amount: DEFAULT_SKIP_PENALTY_AMOUNT,
                random_retry_count: DEFAULT_RANDOM_RETRY_COUNT,
                score_algorithm_type: DEFAULT_SCORE_ALGORITHM_TYPE,
                score_scale: DEFAULT_SCORE_SCALE,
                score_log_base: DEFAULT_SCORE_LOG_BASE,
                treasury_address,
                admin_address,
            },
            media_records: vector::empty<MediaRecord>(),
            user_media_indices: vector::empty<UserMediaIndex>(),
            user_summaries: vector::empty<UserSummaryRecord>(),
            next_media_id: 0,
        });
    }

    public entry fun registerMedia(
        account: &signer,
        category: u8,
        shelby_blob_ref: vector<u8>,
        content_hash: vector<u8>,
        mime_type: vector<u8>,
        title: vector<u8>,
        created_time: u64,
    ) {
        assertInitialized();
        assertValidCategory(category);

        let owner = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        let media_id = state.next_media_id;
        state.next_media_id = media_id + 1;

        vector::push_back(&mut state.media_records, MediaRecord {
            media_id,
            owner,
            category,
            shelby_blob_ref,
            content_hash,
            mime_type,
            title,
            created_time,
            status: STATUS_IDLE,
        });

        addUserMediaId(state, owner, media_id);
        ensureUserSummary(state, owner);
    }

    #[view]
    public fun getUserMedia(owner: address): vector<u64> acquires PalateState {
        assertInitialized();

        let state = borrow_global<PalateState>(@palate);
        let length = vector::length(&state.user_media_indices);
        let index = 0;
        while (index < length) {
            let user_media = vector::borrow(&state.user_media_indices, index);
            if (user_media.owner == owner) {
                return user_media.media_ids
            };
            index = index + 1;
        };

        vector::empty<u64>()
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

    #[view]
    public fun getUserSummary(owner: address): UserSummary acquires PalateState {
        assertInitialized();

        let state = borrow_global<PalateState>(@palate);
        let length = vector::length(&state.user_summaries);
        let index = 0;
        while (index < length) {
            let record = vector::borrow(&state.user_summaries, index);
            if (record.owner == owner) {
                return record.summary
            };
            index = index + 1;
        };

        createEmptyUserSummary()
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

    #[view]
    public fun getProtocolConfig(): ProtocolConfig acquires PalateState {
        assertInitialized();
        borrow_global<PalateState>(@palate).protocol_config
    }

    #[view]
    public fun getMediaRecord(media_id: u64): MediaRecord acquires PalateState {
        let state = borrow_global<PalateState>(@palate);
        let index = findMediaIndex(state, media_id);
        *vector::borrow(&state.media_records, index)
    }

    #[view]
    public fun getMediaOwner(media_id: u64): address acquires PalateState {
        getMediaRecord(media_id).owner
    }

    #[view]
    public fun getMediaCategory(media_id: u64): u8 acquires PalateState {
        getMediaRecord(media_id).category
    }

    #[view]
    public fun getMediaShelbyBlobRef(media_id: u64): vector<u8> acquires PalateState {
        getMediaRecord(media_id).shelby_blob_ref
    }

    #[view]
    public fun getMediaContentHash(media_id: u64): vector<u8> acquires PalateState {
        getMediaRecord(media_id).content_hash
    }

    #[view]
    public fun getMediaMimeType(media_id: u64): vector<u8> acquires PalateState {
        getMediaRecord(media_id).mime_type
    }

    #[view]
    public fun getMediaTitle(media_id: u64): vector<u8> acquires PalateState {
        getMediaRecord(media_id).title
    }

    #[view]
    public fun getMediaCreatedTime(media_id: u64): u64 acquires PalateState {
        getMediaRecord(media_id).created_time
    }

    #[view]
    public fun getMediaStatus(media_id: u64): u8 acquires PalateState {
        getMediaRecord(media_id).status
    }

    #[view]
    public fun getNextMediaId(): u64 acquires PalateState {
        assertInitialized();
        borrow_global<PalateState>(@palate).next_media_id
    }

    #[view]
    public fun getProtocolFeeBps(): u64 acquires PalateState {
        getProtocolConfig().protocol_fee_bps
    }

    #[view]
    public fun getMinPushAmount(): u64 acquires PalateState {
        getProtocolConfig().min_push_amount
    }

    #[view]
    public fun getMinBuffAmount(): u64 acquires PalateState {
        getProtocolConfig().min_buff_amount
    }

    #[view]
    public fun getMinPushIncrementBps(): u64 acquires PalateState {
        getProtocolConfig().min_push_increment_bps
    }

    #[view]
    public fun getMatchDurationSeconds(): u64 acquires PalateState {
        getProtocolConfig().match_duration_seconds
    }

    #[view]
    public fun getBuffCommitmentAmount(): u64 acquires PalateState {
        getProtocolConfig().buff_commitment_amount
    }

    #[view]
    public fun getSkipPenaltyAmount(): u64 acquires PalateState {
        getProtocolConfig().skip_penalty_amount
    }

    #[view]
    public fun getRandomRetryCount(): u64 acquires PalateState {
        getProtocolConfig().random_retry_count
    }

    #[view]
    public fun getScoreAlgorithmType(): u8 acquires PalateState {
        getProtocolConfig().score_algorithm_type
    }

    #[view]
    public fun getScoreScale(): u64 acquires PalateState {
        getProtocolConfig().score_scale
    }

    #[view]
    public fun getScoreLogBase(): u64 acquires PalateState {
        getProtocolConfig().score_log_base
    }

    #[view]
    public fun getTreasuryAddress(): address acquires PalateState {
        getProtocolConfig().treasury_address
    }

    #[view]
    public fun getAdminAddress(): address acquires PalateState {
        getProtocolConfig().admin_address
    }

    #[view]
    public fun getUserSummaryPushCount(owner: address): u64 acquires PalateState {
        getUserSummary(owner).push_count
    }

    #[view]
    public fun getUserSummaryBuffCount(owner: address): u64 acquires PalateState {
        getUserSummary(owner).buff_count
    }

    #[view]
    public fun getUserSummaryClaimableAmount(owner: address): u64 acquires PalateState {
        getUserSummary(owner).claimable_amount
    }

    #[view]
    public fun categoryMeme(): u8 {
        CATEGORY_MEME
    }

    #[view]
    public fun categoryImage(): u8 {
        CATEGORY_IMAGE
    }

    #[view]
    public fun statusIdle(): u8 {
        STATUS_IDLE
    }

    fun assertInitialized() {
        assert!(exists<PalateState>(@palate), E_NOT_INITIALIZED);
    }

    fun assertValidCategory(category: u8) {
        assert!(
            category == CATEGORY_MEME || category == CATEGORY_IMAGE,
            E_INVALID_CATEGORY,
        );
    }

    fun addUserMediaId(state: &mut PalateState, owner: address, media_id: u64) {
        let length = vector::length(&state.user_media_indices);
        let index = 0;
        while (index < length) {
            let user_media = vector::borrow_mut(&mut state.user_media_indices, index);
            if (user_media.owner == owner) {
                vector::push_back(&mut user_media.media_ids, media_id);
                return
            };
            index = index + 1;
        };

        vector::push_back(&mut state.user_media_indices, UserMediaIndex {
            owner,
            media_ids: vector::singleton(media_id),
        });
    }

    fun ensureUserSummary(state: &mut PalateState, owner: address) {
        let length = vector::length(&state.user_summaries);
        let index = 0;
        while (index < length) {
            let record = vector::borrow(&state.user_summaries, index);
            if (record.owner == owner) {
                return
            };
            index = index + 1;
        };

        vector::push_back(&mut state.user_summaries, UserSummaryRecord {
            owner,
            summary: createEmptyUserSummary(),
        });
    }

    fun findMediaIndex(state: &PalateState, media_id: u64): u64 {
        let length = vector::length(&state.media_records);
        let index = 0;
        while (index < length) {
            let media = vector::borrow(&state.media_records, index);
            if (media.media_id == media_id) {
                return index
            };
            index = index + 1;
        };

        abort E_MEDIA_NOT_FOUND
    }

    fun createEmptyUserSummary(): UserSummary {
        UserSummary {
            push_count: 0,
            push_win_count: 0,
            push_loss_count: 0,
            push_profit: 0,
            buff_count: 0,
            buff_win_count: 0,
            buff_loss_count: 0,
            buff_profit: 0,
            total_pushed: 0,
            total_buffed: 0,
            claimable_amount: 0,
        }
    }
}
