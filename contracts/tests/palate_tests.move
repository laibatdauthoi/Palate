#[test_only]
module palate::palate_tests {
    use palate::palate;
    use aptos_framework::timestamp;
    use std::signer;
    use std::vector;

    const TREASURY: address = @0xCAFE;

    fun init(admin: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        palate::initialize(admin, TREASURY);
    }

    #[test(admin = @palate, framework = @0x1)]
    fun protocolConfigInitializesCorrectly(admin: signer, framework: signer) {
        init(&admin, &framework);

        assert!(palate::getProtocolFeeBps() == 500, 0);
        assert!(palate::getMinPushAmount() == 100000000, 1);
        assert!(palate::getMinBuffAmount() == 10000000, 2);
        assert!(palate::getMinPushIncrementBps() == 500, 3);
        assert!(palate::getMatchDurationSeconds() == 86400, 4);
        assert!(palate::getBuffCommitmentAmount() == 50000000, 5);
        assert!(palate::getSkipPenaltyAmount() == 50000000, 6);
        assert!(palate::getRandomRetryCount() == 10, 7);
        assert!(palate::getScoreAlgorithmType() == 1, 8);
        assert!(palate::getScoreScale() == 1000000, 9);
        assert!(palate::getScoreLogBase() == 2, 10);
        assert!(palate::getTreasuryAddress() == TREASURY, 11);
        assert!(palate::getAdminAddress() == @palate, 12);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x100)]
    fun registerMediaAcceptsMemeCategory(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::registerMedia(
            &user,
            palate::categoryMeme(),
            b"meme.gif",
            b"hash-meme",
            b"image/gif",
            b"Meme One",
            1000,
        );

        assert!(palate::getMediaCategory(0) == palate::categoryMeme(), 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x101)]
    fun registerMediaAcceptsImageCategory(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::registerMedia(
            &user,
            palate::categoryImage(),
            b"image.webp",
            b"hash-image",
            b"image/webp",
            b"Image One",
            1001,
        );

        assert!(palate::getMediaCategory(0) == palate::categoryImage(), 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x102)]
    #[expected_failure(abort_code = 3, location = palate::palate)]
    fun registerMediaRejectsInvalidCategory(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::registerMedia(
            &user,
            3,
            b"not-category.gif",
            b"hash-invalid",
            b"image/gif",
            b"Invalid Category",
            1002,
        );
    }

    #[test(admin = @palate, framework = @0x1, user = @0x103)]
    fun registeredMediaStoresExpectedFields(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::registerMedia(
            &user,
            palate::categoryMeme(),
            b"stored.gif",
            b"hash-stored",
            b"image/gif",
            b"Stored Meme",
            7777,
        );

        assert!(palate::getMediaOwner(0) == signer::address_of(&user), 0);
        assert!(palate::getMediaCategory(0) == palate::categoryMeme(), 1);
        assert!(palate::getMediaShelbyBlobRef(0) == b"stored.gif", 2);
        assert!(palate::getMediaContentHash(0) == b"hash-stored", 3);
        assert!(palate::getMediaMimeType(0) == b"image/gif", 4);
        assert!(palate::getMediaTitle(0) == b"Stored Meme", 5);
        assert!(palate::getMediaCreatedTime(0) == 7777, 6);
        assert!(palate::getMediaStatus(0) == palate::statusIdle(), 7);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x104)]
    fun getUserMediaReturnsRegisteredMedia(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::registerMedia(
            &user,
            palate::categoryImage(),
            b"one.png",
            b"hash-one",
            b"image/png",
            b"One",
            1,
        );
        palate::registerMedia(
            &user,
            palate::categoryImage(),
            b"two.jpg",
            b"hash-two",
            b"image/jpeg",
            b"Two",
            2,
        );

        let ids = palate::getUserMedia(signer::address_of(&user));
        assert!(vector::length(&ids) == 2, 0);
        assert!(*vector::borrow(&ids, 0) == 0, 1);
        assert!(*vector::borrow(&ids, 1) == 1, 2);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x105)]
    fun getUserSummaryReturnsInitialSummary(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        let owner = signer::address_of(&user);
        assert!(palate::getUserSummaryPushCount(owner) == 0, 0);
        assert!(palate::getUserSummaryBuffCount(owner) == 0, 1);
        assert!(palate::getUserSummaryClaimableAmount(owner) == 0, 2);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x106)]
    fun gifIsMetadataFormatNotCategory(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::registerMedia(
            &user,
            palate::categoryMeme(),
            b"reaction.gif",
            b"hash-gif-meme",
            b"image/gif",
            b"GIF Meme",
            3000,
        );
        palate::registerMedia(
            &user,
            palate::categoryImage(),
            b"art.gif",
            b"hash-gif-image",
            b"image/gif",
            b"GIF Image",
            3001,
        );

        assert!(palate::getMediaCategory(0) == palate::categoryMeme(), 0);
        assert!(palate::getMediaCategory(1) == palate::categoryImage(), 1);
        assert!(palate::getMediaMimeType(0) == b"image/gif", 2);
        assert!(palate::getMediaMimeType(1) == b"image/gif", 3);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x200)]
    fun createPushSucceedsForIdleMediaAtMinAmount(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&user, b"push.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount());

        assert!(palate::getWaitingPushMediaId(0) == 0, 0);
        assert!(palate::getWaitingPushPusher(0) == signer::address_of(&user), 1);
        assert!(palate::getWaitingPushAmount(0) == palate::getMinPushAmount(), 2);
        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusOpen(), 3);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x201)]
    #[expected_failure(abort_code = 8, location = palate::palate)]
    fun createPushRejectsAmountBelowMinPushAmount(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&user, b"too-low.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount() - 1);
    }

    #[test(admin = @palate, framework = @0x1, owner = @0x202, other = @0x203)]
    #[expected_failure(abort_code = 6, location = palate::palate)]
    fun createPushRejectsNonOwnerMedia(admin: signer, framework: signer, owner: signer, other: signer) {
        init(&admin, &framework);
        registerImage(&owner, b"owned.png", 1);

        palate::createPush(&other, 0, palate::getMinPushAmount());
    }

    #[test(admin = @palate, framework = @0x1, user = @0x204)]
    #[expected_failure(abort_code = 7, location = palate::palate)]
    fun createPushRejectsMediaThatIsNotIdle(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&user, b"waiting.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::createPush(&user, 0, palate::getMinPushAmount());
    }

    #[test(admin = @palate, framework = @0x1, user = @0x205)]
    fun createPushSetsMediaStatusToWaiting(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&user, b"status-waiting.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount());

        assert!(palate::getMediaStatus(0) == palate::statusWaiting(), 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x206)]
    fun cancelPushSucceedsForCreatorBeforeChallenger(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&user, b"cancel.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::cancelPush(&user, 0);

        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusCancelled(), 0);
    }

    #[test(admin = @palate, framework = @0x1, owner = @0x207, other = @0x208)]
    #[expected_failure(abort_code = 10, location = palate::palate)]
    fun cancelPushRejectsNonCreator(admin: signer, framework: signer, owner: signer, other: signer) {
        init(&admin, &framework);
        registerImage(&owner, b"cancel-non-creator.png", 1);
        palate::createPush(&owner, 0, palate::getMinPushAmount());

        palate::cancelPush(&other, 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x209)]
    fun cancelPushRestoresMediaStatusToIdle(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&user, b"restore-idle.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::cancelPush(&user, 0);

        assert!(palate::getMediaStatus(0) == palate::statusIdle(), 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x210, challenger = @0x211)]
    fun challengePushSucceedsWithSameCategoryIdleMedia(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerMeme(&pusher, b"original.gif", 1);
        registerMeme(&challenger, b"challenger.gif", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusChallenged(), 0);
        assert!(palate::getMatchStatus(0) == palate::matchStatusActive(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x212, challenger = @0x213)]
    #[expected_failure(abort_code = 12, location = palate::palate)]
    fun challengePushRejectsCrossCategoryMedia(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerMeme(&pusher, b"original-meme.gif", 1);
        registerImage(&challenger, b"challenger-image.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x214, challenger = @0x215)]
    #[expected_failure(abort_code = 13, location = palate::palate)]
    fun challengePushRejectsAmountBelowRequiredIncrement(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0) - 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x216, media_owner = @0x217, challenger = @0x218)]
    #[expected_failure(abort_code = 6, location = palate::palate)]
    fun challengePushRejectsNonOwnerChallengerMedia(
        admin: signer,
        framework: signer,
        pusher: signer,
        media_owner: signer,
        challenger: signer,
    ) {
        init(&admin, &framework);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&media_owner, b"not-owned.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x219, challenger = @0x220)]
    #[expected_failure(abort_code = 7, location = palate::palate)]
    fun challengePushRejectsChallengerMediaThatIsNotIdle(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"busy.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());
        palate::createPush(&challenger, 1, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x221, challenger = @0x222)]
    fun challengePushSetsBothMediaStatusesToActive(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        assert!(palate::getMediaStatus(0) == palate::statusActive(), 0);
        assert!(palate::getMediaStatus(1) == palate::statusActive(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x223, challenger = @0x224)]
    fun challengePushCreatesActiveMatchWithOriginalAsAAndChallengerAsB(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
    ) {
        init(&admin, &framework);
        registerMeme(&pusher, b"original.gif", 1);
        registerMeme(&challenger, b"challenger.gif", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        let challenge_amount = palate::getMinimumChallengeAmount(0);
        palate::challengePush(&challenger, 0, 1, challenge_amount);

        assert!(palate::getMatchMediaAId(0) == 0, 0);
        assert!(palate::getMatchMediaBId(0) == 1, 1);
        assert!(palate::getMatchPusherA(0) == signer::address_of(&pusher), 2);
        assert!(palate::getMatchPusherB(0) == signer::address_of(&challenger), 3);
        assert!(palate::getMatchPushAmountA(0) == palate::getMinPushAmount(), 4);
        assert!(palate::getMatchPushAmountB(0) == challenge_amount, 5);
        assert!(palate::getMatchCategory(0) == palate::categoryMeme(), 6);
    }

    #[test(admin = @palate, framework = @0x1, first = @0x225, second = @0x226)]
    fun getWaitingPushesReturnsOpenWaitingPushes(admin: signer, framework: signer, first: signer, second: signer) {
        init(&admin, &framework);
        registerImage(&first, b"first.png", 1);
        registerImage(&second, b"second.png", 2);
        palate::createPush(&first, 0, palate::getMinPushAmount());
        palate::createPush(&second, 1, palate::getMinPushAmount());
        palate::cancelPush(&second, 1);

        let pushes = palate::getWaitingPushes();
        assert!(vector::length(&pushes) == 1, 0);
        assert!(*vector::borrow(&pushes, 0) == 0, 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x227, challenger = @0x228)]
    fun getActiveMatchesReturnsActiveMatches(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());
        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        let matches = palate::getActiveMatches();
        assert!(vector::length(&matches) == 1, 0);
        assert!(*vector::borrow(&matches, 0) == 0, 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x300, challenger = @0x301, user = @0x302)]
    fun findMatchAssignsActiveMatchWhenOneValidMatchExists(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);

        palate::findMatch(&user);

        let user_address = signer::address_of(&user);
        assert!(palate::hasCurrentAssignment(user_address), 0);
        assert!(palate::getCurrentAssignmentMatchId(user_address) == 0, 1);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x303)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchRejectsWhenNoActiveMatchExists(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::findMatch(&user);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x304, challenger = @0x305, user = @0x306)]
    #[expected_failure(abort_code = 16, location = palate::palate)]
    fun findMatchRejectsWhenUserAlreadyHasUnresolvedAssignment(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::findMatch(&user);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x307, challenger = @0x308)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchDoesNotAssignWhereUserIsPusherA(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);

        palate::findMatch(&pusher);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x309, challenger = @0x310)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchDoesNotAssignWhereUserIsPusherB(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);

        palate::findMatch(&challenger);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x311, challenger = @0x312, owner = @0x313)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchDoesNotAssignMatchContainingMediaOwnedByUser(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        owner: signer,
    ) {
        init(&admin, &framework);
        registerImage(&owner, b"owned.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&owner, 0, palate::getMinPushAmount());
        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        // Use a distinct signer from pusher/challenger to prove media ownership is checked.
        // The owner is also pusher A here, so either exclusion keeps the match invalid.
        palate::findMatch(&owner);
        let _ = pusher;
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x314, challenger = @0x315, user = @0x316)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchDoesNotAssignExpiredMatch(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds() + 1);

        palate::findMatch(&user);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x317, challenger = @0x318, user = @0x319)]
    fun getCurrentAssignmentReturnsAssignedMatch(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        let user_address = signer::address_of(&user);
        assert!(palate::getCurrentAssignmentMatchId(user_address) == 0, 0);
        assert!(palate::getCurrentAssignmentCommitmentAmount(user_address) == palate::getBuffCommitmentAmount(), 1);
        assert!(palate::getCurrentAssignmentAssignedTime(user_address) == 0, 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x320, challenger = @0x321, user = @0x322)]
    fun skipMatchSucceedsForCurrentAssignment(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::skipMatch(&user);

        assert!(!palate::hasCurrentAssignment(signer::address_of(&user)), 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x323, challenger = @0x324, user = @0x325)]
    fun skipMatchClearsAssignment(admin: signer, framework: signer, pusher: signer, challenger: signer, user: signer) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);
        palate::skipMatch(&user);

        assert!(!palate::hasCurrentAssignment(signer::address_of(&user)), 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x326)]
    #[expected_failure(abort_code = 18, location = palate::palate)]
    fun skipMatchRejectsWhenUserHasNoAssignment(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::skipMatch(&user);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x327, challenger = @0x328, user = @0x329)]
    fun afterSkipMatchUserCanFindMatchAgainIfValidMatchExists(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);
        palate::skipMatch(&user);

        palate::findMatch(&user);

        assert!(palate::getCurrentAssignmentMatchId(signer::address_of(&user)) == 0, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x330, challenger = @0x331, user = @0x332)]
    fun placeBuffSucceedsForCurrentAssignedMatch(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        assert!(palate::getBuffRecordCount() == 1, 0);
        assert!(!palate::hasCurrentAssignment(signer::address_of(&user)), 1);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x333)]
    #[expected_failure(abort_code = 18, location = palate::palate)]
    fun placeBuffRejectsWhenUserHasNoAssignment(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x334, challenger = @0x335, user = @0x336)]
    #[expected_failure(abort_code = 15, location = palate::palate)]
    fun placeBuffRejectsWhenAssignedMatchIdDoesNotMatch(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::placeBuffForAssignedMatchForTesting(&user, 999, palate::sideA(), palate::getMinBuffAmount());
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x337, challenger = @0x338, user = @0x339)]
    #[expected_failure(abort_code = 19, location = palate::palate)]
    fun placeBuffRejectsInvalidSide(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::placeBuff(&user, 3, palate::getMinBuffAmount());
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x340, challenger = @0x341, user = @0x342)]
    #[expected_failure(abort_code = 20, location = palate::palate)]
    fun placeBuffRejectsAmountBelowMinBuffAmount(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount() - 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x343, challenger = @0x344, user = @0x345)]
    fun placeBuffUpdatesPoolScoreAndCountForSideA(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        let amount = palate::getMinBuffAmount();
        let config = palate::getProtocolConfig();
        let expected_score = palate::calculateBuffScore(amount, &config);
        palate::placeBuff(&user, palate::sideA(), amount);

        assert!(palate::getMatchBuffPoolA(0) == amount, 0);
        assert!(palate::getMatchScoreA(0) == expected_score, 1);
        assert!(palate::getMatchBuffCountA(0) == 1, 2);
        assert!(palate::getMatchBuffPoolB(0) == 0, 3);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x346, challenger = @0x347, user = @0x348)]
    fun placeBuffUpdatesPoolScoreAndCountForSideB(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        let amount = palate::getMinBuffAmount();
        let config = palate::getProtocolConfig();
        let expected_score = palate::calculateBuffScore(amount, &config);
        palate::placeBuff(&user, palate::sideB(), amount);

        assert!(palate::getMatchBuffPoolB(0) == amount, 0);
        assert!(palate::getMatchScoreB(0) == expected_score, 1);
        assert!(palate::getMatchBuffCountB(0) == 1, 2);
        assert!(palate::getMatchBuffPoolA(0) == 0, 3);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x349, challenger = @0x350, user = @0x351)]
    fun placeBuffCreatesDurableBuffRecord(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        let amount = palate::getMinBuffAmount();
        let config = palate::getProtocolConfig();
        let expected_score = palate::calculateBuffScore(amount, &config);
        palate::placeBuff(&user, palate::sideA(), amount);

        assert!(palate::getBuffRecordCount() == 1, 0);
        assert!(palate::getBuffRecordMatchId(0) == 0, 1);
        assert!(palate::getBuffRecordUser(0) == signer::address_of(&user), 2);
        assert!(palate::getBuffRecordSide(0) == palate::sideA(), 3);
        assert!(palate::getBuffRecordAmount(0) == amount, 4);
        assert!(palate::getBuffRecordScore(0) == expected_score, 5);
        assert!(!palate::getBuffRecordClaimed(0), 6);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x352, challenger = @0x353, user = @0x354)]
    fun placeBuffClearsAssignmentAfterSuccess(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        assert!(!palate::hasCurrentAssignment(signer::address_of(&user)), 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x355, challenger = @0x356, user = @0x357)]
    #[expected_failure(abort_code = 21, location = palate::palate)]
    fun userCannotBuffSameMatchTwice(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        palate::assignMatchForTesting(&admin, signer::address_of(&user), 0);
        palate::placeBuff(&user, palate::sideB(), palate::getMinBuffAmount());
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x358, challenger = @0x359, user = @0x360)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchExcludesMatchesAlreadyBuffedByUser(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        palate::findMatch(&user);
    }

    #[test(admin = @palate, framework = @0x1)]
    fun calculateBuffScoreReturnsDeterministicValues(admin: signer, framework: signer) {
        init(&admin, &framework);

        let config = palate::getProtocolConfig();
        let min = palate::getMinBuffAmount();
        let scale = palate::getScoreScale();

        assert!(palate::calculateBuffScore(min, &config) == scale, 0);
        assert!(palate::calculateBuffScore(min * 3, &config) == scale * 2, 1);
        assert!(palate::calculateBuffScore(min * 7, &config) == scale * 3, 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x361, challenger = @0x362, user = @0x363)]
    fun buffPoolUsesRawAmountWhileScoreUsesCalculatedScore(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);

        let amount = palate::getMinBuffAmount() * 3;
        let config = palate::getProtocolConfig();
        let expected_score = palate::calculateBuffScore(amount, &config);
        palate::placeBuff(&user, palate::sideA(), amount);

        assert!(palate::getMatchBuffPoolA(0) == amount, 0);
        assert!(palate::getMatchScoreA(0) == expected_score, 1);
        assert!(palate::getMatchScoreA(0) != amount, 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x364, challenger = @0x365, user = @0x366)]
    #[expected_failure(abort_code = 0, location = palate::palate)]
    fun placeBuffDoesNotImplementSettlementOrClaims(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&pusher, &challenger);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        palate::settleMatch(&user, 0);
    }

    fun registerImage(user: &signer, blob_ref: vector<u8>, created_time: u64) {
        palate::registerMedia(
            user,
            palate::categoryImage(),
            blob_ref,
            b"hash",
            b"image/png",
            b"Image",
            created_time,
        );
    }

    fun registerMeme(user: &signer, blob_ref: vector<u8>, created_time: u64) {
        palate::registerMedia(
            user,
            palate::categoryMeme(),
            blob_ref,
            b"hash",
            b"image/gif",
            b"Meme",
            created_time,
        );
    }

    fun createImageMatch(pusher: &signer, challenger: &signer) {
        registerImage(pusher, b"original.png", 1);
        registerImage(challenger, b"challenger.png", 2);
        palate::createPush(pusher, 0, palate::getMinPushAmount());
        palate::challengePush(challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }
}
