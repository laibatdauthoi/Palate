module palate::palate {
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use std::signer;
    use std::vector;

    /// Task scaffold only for functions outside Task 2.
    const E_NOT_IMPLEMENTED: u64 = 0;
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_INVALID_CATEGORY: u64 = 3;
    const E_MEDIA_NOT_FOUND: u64 = 4;
    const E_NOT_MODULE_PUBLISHER: u64 = 5;
    const E_NOT_MEDIA_OWNER: u64 = 6;
    const E_MEDIA_NOT_IDLE: u64 = 7;
    const E_PUSH_AMOUNT_TOO_LOW: u64 = 8;
    const E_PUSH_NOT_FOUND: u64 = 9;
    const E_NOT_PUSH_CREATOR: u64 = 10;
    const E_PUSH_NOT_OPEN: u64 = 11;
    const E_CATEGORY_MISMATCH: u64 = 12;
    const E_CHALLENGE_AMOUNT_TOO_LOW: u64 = 13;
    const E_PUSHER_CANNOT_CHALLENGE_OWN_PUSH: u64 = 14;
    const E_MATCH_NOT_FOUND: u64 = 15;
    const E_ASSIGNMENT_EXISTS: u64 = 16;
    const E_NO_VALID_MATCH: u64 = 17;
    const E_ASSIGNMENT_NOT_FOUND: u64 = 18;
    const E_INVALID_BUFF_SIDE: u64 = 19;
    const E_BUFF_AMOUNT_TOO_LOW: u64 = 20;
    const E_ALREADY_BUFFED_MATCH: u64 = 21;
    const E_UNSUPPORTED_SCORE_ALGORITHM: u64 = 22;

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
        waiting_pushes: vector<WaitingPush>,
        active_matches: vector<ActiveMatch>,
        buff_records: vector<BuffRecord>,
        user_assignments: vector<UserAssignment>,
        user_media_indices: vector<UserMediaIndex>,
        user_summaries: vector<UserSummaryRecord>,
        next_media_id: u64,
        next_push_id: u64,
        next_match_id: u64,
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

    #[event]
    struct PushCreatedEvent has drop, store {
        push_id: u64,
        media_id: u64,
        pusher: address,
        category: u8,
        push_amount: u64,
    }

    #[event]
    struct PushCancelledEvent has drop, store {
        push_id: u64,
        media_id: u64,
        pusher: address,
    }

    #[event]
    struct PushChallengedEvent has drop, store {
        push_id: u64,
        match_id: u64,
        media_a_id: u64,
        media_b_id: u64,
        pusher_a: address,
        pusher_b: address,
        push_amount_a: u64,
        push_amount_b: u64,
        category: u8,
    }

    #[event]
    struct MatchAssignedEvent has drop, store {
        user: address,
        match_id: u64,
        commitment_amount: u64,
        assigned_time: u64,
    }

    #[event]
    struct MatchSkippedEvent has drop, store {
        user: address,
        match_id: u64,
        skip_penalty_amount: u64,
    }

    #[event]
    struct BuffPlacedEvent has drop, store {
        match_id: u64,
        user: address,
        side: u8,
        buff_amount: u64,
        score: u64,
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
            waiting_pushes: vector::empty<WaitingPush>(),
            active_matches: vector::empty<ActiveMatch>(),
            buff_records: vector::empty<BuffRecord>(),
            user_assignments: vector::empty<UserAssignment>(),
            user_media_indices: vector::empty<UserMediaIndex>(),
            user_summaries: vector::empty<UserSummaryRecord>(),
            next_media_id: 0,
            next_push_id: 0,
            next_match_id: 0,
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

    public entry fun createPush(account: &signer, media_id: u64, push_amount: u64) acquires PalateState {
        assertInitialized();

        let pusher = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        assert!(push_amount >= state.protocol_config.min_push_amount, E_PUSH_AMOUNT_TOO_LOW);

        let media_index = findMediaIndex(state, media_id);
        let media = vector::borrow_mut(&mut state.media_records, media_index);
        assert!(media.owner == pusher, E_NOT_MEDIA_OWNER);
        assert!(media.status == STATUS_IDLE, E_MEDIA_NOT_IDLE);

        media.status = STATUS_WAITING;

        let push_id = state.next_push_id;
        state.next_push_id = push_id + 1;
        let category = media.category;

        vector::push_back(&mut state.waiting_pushes, WaitingPush {
            push_id,
            media_id,
            pusher,
            category,
            push_amount,
            created_time: 0,
            status: WAITING_PUSH_STATUS_OPEN,
        });

        event::emit(PushCreatedEvent {
            push_id,
            media_id,
            pusher,
            category,
            push_amount,
        });
    }

    public entry fun cancelPush(account: &signer, push_id: u64) acquires PalateState {
        assertInitialized();

        let pusher = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        let push_index = findWaitingPushIndex(state, push_id);

        let media_id;
        {
            let waiting_push = vector::borrow(&state.waiting_pushes, push_index);
            assert!(waiting_push.pusher == pusher, E_NOT_PUSH_CREATOR);
            assert!(waiting_push.status == WAITING_PUSH_STATUS_OPEN, E_PUSH_NOT_OPEN);
            media_id = waiting_push.media_id;
        };

        let media_index = findMediaIndex(state, media_id);
        vector::borrow_mut(&mut state.media_records, media_index).status = STATUS_IDLE;
        vector::borrow_mut(&mut state.waiting_pushes, push_index).status = WAITING_PUSH_STATUS_CANCELLED;

        event::emit(PushCancelledEvent {
            push_id,
            media_id,
            pusher,
        });
    }

    public entry fun challengePush(
        account: &signer,
        push_id: u64,
        challenger_media_id: u64,
        push_amount: u64,
    ) acquires PalateState {
        assertInitialized();

        let challenger = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        let push_index = findWaitingPushIndex(state, push_id);

        let media_a_id;
        let pusher_a;
        let push_amount_a;
        let category;
        {
            let waiting_push = vector::borrow(&state.waiting_pushes, push_index);
            assert!(waiting_push.status == WAITING_PUSH_STATUS_OPEN, E_PUSH_NOT_OPEN);
            assert!(waiting_push.pusher != challenger, E_PUSHER_CANNOT_CHALLENGE_OWN_PUSH);
            media_a_id = waiting_push.media_id;
            pusher_a = waiting_push.pusher;
            push_amount_a = waiting_push.push_amount;
            category = waiting_push.category;
        };

        let required_amount = calculateMinimumChallengeAmount(
            push_amount_a,
            state.protocol_config.min_push_increment_bps,
        );
        assert!(push_amount >= required_amount, E_CHALLENGE_AMOUNT_TOO_LOW);

        let challenger_media_index = findMediaIndex(state, challenger_media_id);
        {
            let challenger_media = vector::borrow(&state.media_records, challenger_media_index);
            assert!(challenger_media.owner == challenger, E_NOT_MEDIA_OWNER);
            assert!(challenger_media.status == STATUS_IDLE, E_MEDIA_NOT_IDLE);
            assert!(challenger_media.category == category, E_CATEGORY_MISMATCH);
        };

        let media_a_index = findMediaIndex(state, media_a_id);
        vector::borrow_mut(&mut state.media_records, media_a_index).status = STATUS_ACTIVE;
        vector::borrow_mut(&mut state.media_records, challenger_media_index).status = STATUS_ACTIVE;
        vector::borrow_mut(&mut state.waiting_pushes, push_index).status = WAITING_PUSH_STATUS_CHALLENGED;

        let match_id = state.next_match_id;
        state.next_match_id = match_id + 1;
        let start_time = timestamp::now_seconds();
        let end_time = start_time + state.protocol_config.match_duration_seconds;

        vector::push_back(&mut state.active_matches, ActiveMatch {
            match_id,
            media_a_id,
            media_b_id: challenger_media_id,
            pusher_a,
            pusher_b: challenger,
            push_amount_a,
            push_amount_b: push_amount,
            category,
            start_time,
            end_time,
            buff_pool_a: 0,
            buff_pool_b: 0,
            score_a: 0,
            score_b: 0,
            buff_count_a: 0,
            buff_count_b: 0,
            status: MATCH_STATUS_ACTIVE,
        });

        event::emit(PushChallengedEvent {
            push_id,
            match_id,
            media_a_id,
            media_b_id: challenger_media_id,
            pusher_a,
            pusher_b: challenger,
            push_amount_a,
            push_amount_b: push_amount,
            category,
        });
    }

    public entry fun findMatch(account: &signer) acquires PalateState {
        assertInitialized();

        let user = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        assert!(!hasActiveAssignment(state, user), E_ASSIGNMENT_EXISTS);

        let current_time = timestamp::now_seconds();
        let match_index = findValidAssignmentMatchIndex(state, user, current_time);
        let active_match = vector::borrow(&state.active_matches, match_index);
        let match_id = active_match.match_id;
        let commitment_amount = state.protocol_config.buff_commitment_amount;

        vector::push_back(&mut state.user_assignments, UserAssignment {
            user,
            match_id,
            commitment_amount,
            assigned_time: current_time,
        });

        event::emit(MatchAssignedEvent {
            user,
            match_id,
            commitment_amount,
            assigned_time: current_time,
        });
    }

    public entry fun skipMatch(account: &signer) acquires PalateState {
        assertInitialized();

        let user = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        let assignment_index = findAssignmentIndex(state, user);
        let assignment = *vector::borrow(&state.user_assignments, assignment_index);

        vector::swap_remove(&mut state.user_assignments, assignment_index);

        event::emit(MatchSkippedEvent {
            user,
            match_id: assignment.match_id,
            skip_penalty_amount: state.protocol_config.skip_penalty_amount,
        });
    }

    public entry fun placeBuff(account: &signer, side: u8, buff_amount: u64) acquires PalateState {
        placeBuffInternal(account, getAssignedMatchIdForAccount(account), side, buff_amount)
    }

    public fun calculateBuffScore(buff_amount: u64, config: &ProtocolConfig): u64 {
        assert!(config.score_algorithm_type == SCORE_ALGORITHM_LOG, E_UNSUPPORTED_SCORE_ALGORITHM);

        // MVP deterministic fixed-point approximation of:
        // log2(1 + buff_amount / min_buff_amount).
        //
        // The integer part is exact by repeatedly halving a scaled value. The
        // fractional part uses a simple linear approximation over [1, 2). All
        // Buff scoring is routed through this function so the approximation can
        // be replaced later without changing Buff placement state updates.
        let scale = config.score_scale;
        let min_buff_amount = config.min_buff_amount;
        let whole = buff_amount / min_buff_amount + 1;
        let remainder = buff_amount % min_buff_amount;
        let x_scaled = whole * scale + (remainder * scale) / min_buff_amount;
        let score = 0;
        let two_scaled = scale * config.score_log_base;

        while (x_scaled >= two_scaled) {
            x_scaled = x_scaled / config.score_log_base;
            score = score + scale;
        };

        score + (x_scaled - scale)
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

    #[view]
    public fun getMatch(match_id: u64): ActiveMatch acquires PalateState {
        let state = borrow_global<PalateState>(@palate);
        let index = findActiveMatchIndex(state, match_id);
        *vector::borrow(&state.active_matches, index)
    }

    #[view]
    public fun getWaitingPushes(): vector<u64> acquires PalateState {
        assertInitialized();

        let state = borrow_global<PalateState>(@palate);
        let ids = vector::empty<u64>();
        let length = vector::length(&state.waiting_pushes);
        let index = 0;
        while (index < length) {
            let waiting_push = vector::borrow(&state.waiting_pushes, index);
            if (waiting_push.status == WAITING_PUSH_STATUS_OPEN) {
                vector::push_back(&mut ids, waiting_push.push_id);
            };
            index = index + 1;
        };
        ids
    }

    #[view]
    public fun getActiveMatches(): vector<u64> acquires PalateState {
        assertInitialized();

        let state = borrow_global<PalateState>(@palate);
        let ids = vector::empty<u64>();
        let length = vector::length(&state.active_matches);
        let index = 0;
        while (index < length) {
            let active_match = vector::borrow(&state.active_matches, index);
            if (active_match.status == MATCH_STATUS_ACTIVE) {
                vector::push_back(&mut ids, active_match.match_id);
            };
            index = index + 1;
        };
        ids
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
    public fun getWaitingPushMediaId(push_id: u64): u64 acquires PalateState {
        getWaitingPushRecord(push_id).media_id
    }

    #[view]
    public fun getWaitingPushPusher(push_id: u64): address acquires PalateState {
        getWaitingPushRecord(push_id).pusher
    }

    #[view]
    public fun getWaitingPushCategory(push_id: u64): u8 acquires PalateState {
        getWaitingPushRecord(push_id).category
    }

    #[view]
    public fun getWaitingPushAmount(push_id: u64): u64 acquires PalateState {
        getWaitingPushRecord(push_id).push_amount
    }

    #[view]
    public fun getWaitingPushStatus(push_id: u64): u8 acquires PalateState {
        getWaitingPushRecord(push_id).status
    }

    #[view]
    public fun getMatchMediaAId(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).media_a_id
    }

    #[view]
    public fun getMatchMediaBId(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).media_b_id
    }

    #[view]
    public fun getMatchPusherA(match_id: u64): address acquires PalateState {
        getMatch(match_id).pusher_a
    }

    #[view]
    public fun getMatchPusherB(match_id: u64): address acquires PalateState {
        getMatch(match_id).pusher_b
    }

    #[view]
    public fun getMatchPushAmountA(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).push_amount_a
    }

    #[view]
    public fun getMatchPushAmountB(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).push_amount_b
    }

    #[view]
    public fun getMatchCategory(match_id: u64): u8 acquires PalateState {
        getMatch(match_id).category
    }

    #[view]
    public fun getMatchStatus(match_id: u64): u8 acquires PalateState {
        getMatch(match_id).status
    }

    #[view]
    public fun getMatchBuffPoolA(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).buff_pool_a
    }

    #[view]
    public fun getMatchBuffPoolB(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).buff_pool_b
    }

    #[view]
    public fun getMatchScoreA(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).score_a
    }

    #[view]
    public fun getMatchScoreB(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).score_b
    }

    #[view]
    public fun getMatchBuffCountA(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).buff_count_a
    }

    #[view]
    public fun getMatchBuffCountB(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).buff_count_b
    }

    #[view]
    public fun getBuffRecordCount(): u64 acquires PalateState {
        assertInitialized();
        vector::length(&borrow_global<PalateState>(@palate).buff_records)
    }

    #[view]
    public fun getBuffRecordMatchId(index: u64): u64 acquires PalateState {
        vector::borrow(&borrow_global<PalateState>(@palate).buff_records, index).match_id
    }

    #[view]
    public fun getBuffRecordUser(index: u64): address acquires PalateState {
        vector::borrow(&borrow_global<PalateState>(@palate).buff_records, index).user
    }

    #[view]
    public fun getBuffRecordSide(index: u64): u8 acquires PalateState {
        vector::borrow(&borrow_global<PalateState>(@palate).buff_records, index).side
    }

    #[view]
    public fun getBuffRecordAmount(index: u64): u64 acquires PalateState {
        vector::borrow(&borrow_global<PalateState>(@palate).buff_records, index).buff_amount
    }

    #[view]
    public fun getBuffRecordScore(index: u64): u64 acquires PalateState {
        vector::borrow(&borrow_global<PalateState>(@palate).buff_records, index).score
    }

    #[view]
    public fun getBuffRecordClaimed(index: u64): bool acquires PalateState {
        vector::borrow(&borrow_global<PalateState>(@palate).buff_records, index).claimed
    }

    #[view]
    public fun hasBuffedMatch(user: address, match_id: u64): bool acquires PalateState {
        assertInitialized();
        hasBuffedMatchInternal(borrow_global<PalateState>(@palate), user, match_id)
    }

    #[view]
    public fun hasCurrentAssignment(user: address): bool acquires PalateState {
        assertInitialized();
        hasActiveAssignment(borrow_global<PalateState>(@palate), user)
    }

    #[view]
    public fun getCurrentAssignmentMatchId(user: address): u64 acquires PalateState {
        getCurrentAssignment(user).match_id
    }

    #[view]
    public fun getCurrentAssignmentCommitmentAmount(user: address): u64 acquires PalateState {
        getCurrentAssignment(user).commitment_amount
    }

    #[view]
    public fun getCurrentAssignmentAssignedTime(user: address): u64 acquires PalateState {
        getCurrentAssignment(user).assigned_time
    }

    #[view]
    public fun getMatchEndTime(match_id: u64): u64 acquires PalateState {
        getMatch(match_id).end_time
    }

    #[view]
    public fun getMinimumChallengeAmount(push_id: u64): u64 acquires PalateState {
        let state = borrow_global<PalateState>(@palate);
        let push_index = findWaitingPushIndex(state, push_id);
        let waiting_push = vector::borrow(&state.waiting_pushes, push_index);
        calculateMinimumChallengeAmount(
            waiting_push.push_amount,
            state.protocol_config.min_push_increment_bps,
        )
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

    #[view]
    public fun statusWaiting(): u8 {
        STATUS_WAITING
    }

    #[view]
    public fun statusActive(): u8 {
        STATUS_ACTIVE
    }

    #[view]
    public fun waitingPushStatusOpen(): u8 {
        WAITING_PUSH_STATUS_OPEN
    }

    #[view]
    public fun waitingPushStatusCancelled(): u8 {
        WAITING_PUSH_STATUS_CANCELLED
    }

    #[view]
    public fun waitingPushStatusChallenged(): u8 {
        WAITING_PUSH_STATUS_CHALLENGED
    }

    #[view]
    public fun matchStatusActive(): u8 {
        MATCH_STATUS_ACTIVE
    }

    #[view]
    public fun sideA(): u8 {
        SIDE_A
    }

    #[view]
    public fun sideB(): u8 {
        SIDE_B
    }

    #[test_only]
    public entry fun assignMatchForTesting(
        account: &signer,
        user: address,
        match_id: u64,
    ) acquires PalateState {
        assertInitialized();
        assert!(signer::address_of(account) == @palate, E_NOT_MODULE_PUBLISHER);

        let state = borrow_global_mut<PalateState>(@palate);
        assert!(!hasActiveAssignment(state, user), E_ASSIGNMENT_EXISTS);

        vector::push_back(&mut state.user_assignments, UserAssignment {
            user,
            match_id,
            commitment_amount: state.protocol_config.buff_commitment_amount,
            assigned_time: timestamp::now_seconds(),
        });
    }

    #[test_only]
    public entry fun placeBuffForAssignedMatchForTesting(
        account: &signer,
        expected_match_id: u64,
        side: u8,
        buff_amount: u64,
    ) acquires PalateState {
        placeBuffInternal(account, expected_match_id, side, buff_amount)
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

    fun assertValidBuffSide(side: u8) {
        assert!(side == SIDE_A || side == SIDE_B, E_INVALID_BUFF_SIDE);
    }

    fun getAssignedMatchIdForAccount(account: &signer): u64 acquires PalateState {
        let user = signer::address_of(account);
        getCurrentAssignment(user).match_id
    }

    fun placeBuffInternal(
        account: &signer,
        expected_match_id: u64,
        side: u8,
        buff_amount: u64,
    ) acquires PalateState {
        assertInitialized();
        assertValidBuffSide(side);

        let user = signer::address_of(account);
        let state = borrow_global_mut<PalateState>(@palate);
        assert!(buff_amount >= state.protocol_config.min_buff_amount, E_BUFF_AMOUNT_TOO_LOW);

        let assignment_index = findAssignmentIndex(state, user);
        let assignment = *vector::borrow(&state.user_assignments, assignment_index);
        assert!(assignment.match_id == expected_match_id, E_MATCH_NOT_FOUND);
        assert!(!hasBuffedMatchInternal(state, user, assignment.match_id), E_ALREADY_BUFFED_MATCH);

        let match_index = findActiveMatchIndex(state, assignment.match_id);
        let score = calculateBuffScore(buff_amount, &state.protocol_config);

        {
            let active_match = vector::borrow_mut(&mut state.active_matches, match_index);
            assert!(active_match.status == MATCH_STATUS_ACTIVE, E_NO_VALID_MATCH);
            assert!(timestamp::now_seconds() < active_match.end_time, E_NO_VALID_MATCH);

            if (side == SIDE_A) {
                active_match.buff_pool_a = active_match.buff_pool_a + buff_amount;
                active_match.score_a = active_match.score_a + score;
                active_match.buff_count_a = active_match.buff_count_a + 1;
            } else {
                active_match.buff_pool_b = active_match.buff_pool_b + buff_amount;
                active_match.score_b = active_match.score_b + score;
                active_match.buff_count_b = active_match.buff_count_b + 1;
            };
        };

        vector::push_back(&mut state.buff_records, BuffRecord {
            match_id: assignment.match_id,
            user,
            side,
            buff_amount,
            score,
            claimed: false,
        });
        updateUserSummaryForBuff(state, user, buff_amount);
        vector::swap_remove(&mut state.user_assignments, assignment_index);

        event::emit(BuffPlacedEvent {
            match_id: assignment.match_id,
            user,
            side,
            buff_amount,
            score,
        });
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

    fun findWaitingPushIndex(state: &PalateState, push_id: u64): u64 {
        let length = vector::length(&state.waiting_pushes);
        let index = 0;
        while (index < length) {
            let waiting_push = vector::borrow(&state.waiting_pushes, index);
            if (waiting_push.push_id == push_id) {
                return index
            };
            index = index + 1;
        };

        abort E_PUSH_NOT_FOUND
    }

    fun findActiveMatchIndex(state: &PalateState, match_id: u64): u64 {
        let length = vector::length(&state.active_matches);
        let index = 0;
        while (index < length) {
            let active_match = vector::borrow(&state.active_matches, index);
            if (active_match.match_id == match_id) {
                return index
            };
            index = index + 1;
        };

        abort E_MATCH_NOT_FOUND
    }

    fun findAssignmentIndex(state: &PalateState, user: address): u64 {
        let length = vector::length(&state.user_assignments);
        let index = 0;
        while (index < length) {
            let assignment = vector::borrow(&state.user_assignments, index);
            if (assignment.user == user) {
                return index
            };
            index = index + 1;
        };

        abort E_ASSIGNMENT_NOT_FOUND
    }

    fun hasActiveAssignment(state: &PalateState, user: address): bool {
        let length = vector::length(&state.user_assignments);
        let index = 0;
        while (index < length) {
            let assignment = vector::borrow(&state.user_assignments, index);
            if (assignment.user == user) {
                return true
            };
            index = index + 1;
        };

        false
    }

    fun getCurrentAssignment(user: address): UserAssignment acquires PalateState {
        let state = borrow_global<PalateState>(@palate);
        let index = findAssignmentIndex(state, user);
        *vector::borrow(&state.user_assignments, index)
    }

    fun findValidAssignmentMatchIndex(state: &PalateState, user: address, current_time: u64): u64 {
        let length = vector::length(&state.active_matches);
        let index = 0;
        while (index < length) {
            if (isValidAssignmentMatch(state, index, user, current_time)) {
                return index
            };
            index = index + 1;
        };

        abort E_NO_VALID_MATCH
    }

    fun isValidAssignmentMatch(
        state: &PalateState,
        match_index: u64,
        user: address,
        current_time: u64,
    ): bool {
        let active_match = vector::borrow(&state.active_matches, match_index);
        if (active_match.status != MATCH_STATUS_ACTIVE) {
            return false
        };
        if (current_time >= active_match.end_time) {
            return false
        };
        if (active_match.pusher_a == user || active_match.pusher_b == user) {
            return false
        };

        let media_a = vector::borrow(&state.media_records, findMediaIndex(state, active_match.media_a_id));
        if (media_a.owner == user) {
            return false
        };

        let media_b = vector::borrow(&state.media_records, findMediaIndex(state, active_match.media_b_id));
        if (media_b.owner == user) {
            return false
        };

        !hasBuffedMatchInternal(state, user, active_match.match_id)
    }

    fun hasBuffedMatchInternal(state: &PalateState, user: address, match_id: u64): bool {
        let length = vector::length(&state.buff_records);
        let index = 0;
        while (index < length) {
            let buff_record = vector::borrow(&state.buff_records, index);
            if (buff_record.user == user && buff_record.match_id == match_id) {
                return true
            };
            index = index + 1;
        };

        false
    }

    fun updateUserSummaryForBuff(state: &mut PalateState, user: address, buff_amount: u64) {
        ensureUserSummary(state, user);

        let length = vector::length(&state.user_summaries);
        let index = 0;
        while (index < length) {
            let record = vector::borrow_mut(&mut state.user_summaries, index);
            if (record.owner == user) {
                record.summary.buff_count = record.summary.buff_count + 1;
                record.summary.total_buffed = record.summary.total_buffed + buff_amount;
                return
            };
            index = index + 1;
        };
    }

    fun getWaitingPushRecord(push_id: u64): WaitingPush acquires PalateState {
        let state = borrow_global<PalateState>(@palate);
        let index = findWaitingPushIndex(state, push_id);
        *vector::borrow(&state.waiting_pushes, index)
    }

    fun calculateMinimumChallengeAmount(push_amount: u64, increment_bps: u64): u64 {
        let increment = (push_amount * increment_bps + 9999) / 10000;
        push_amount + increment
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
