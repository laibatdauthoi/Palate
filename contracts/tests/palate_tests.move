#[test_only]
module palate::palate_tests {
    use palate::palate;
    use std::signer;
    use std::vector;

    const TREASURY: address = @0xCAFE;

    fun init(admin: &signer) {
        palate::initialize(admin, TREASURY);
    }

    #[test(admin = @palate)]
    fun protocolConfigInitializesCorrectly(admin: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x100)]
    fun registerMediaAcceptsMemeCategory(admin: signer, user: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x101)]
    fun registerMediaAcceptsImageCategory(admin: signer, user: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x102)]
    #[expected_failure(abort_code = 3, location = palate::palate)]
    fun registerMediaRejectsInvalidCategory(admin: signer, user: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x103)]
    fun registeredMediaStoresExpectedFields(admin: signer, user: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x104)]
    fun getUserMediaReturnsRegisteredMedia(admin: signer, user: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x105)]
    fun getUserSummaryReturnsInitialSummary(admin: signer, user: signer) {
        init(&admin);

        let owner = signer::address_of(&user);
        assert!(palate::getUserSummaryPushCount(owner) == 0, 0);
        assert!(palate::getUserSummaryBuffCount(owner) == 0, 1);
        assert!(palate::getUserSummaryClaimableAmount(owner) == 0, 2);
    }

    #[test(admin = @palate, user = @0x106)]
    fun gifIsMetadataFormatNotCategory(admin: signer, user: signer) {
        init(&admin);

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

    #[test(admin = @palate, user = @0x200)]
    fun createPushSucceedsForIdleMediaAtMinAmount(admin: signer, user: signer) {
        init(&admin);
        registerImage(&user, b"push.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount());

        assert!(palate::getWaitingPushMediaId(0) == 0, 0);
        assert!(palate::getWaitingPushPusher(0) == signer::address_of(&user), 1);
        assert!(palate::getWaitingPushAmount(0) == palate::getMinPushAmount(), 2);
        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusOpen(), 3);
    }

    #[test(admin = @palate, user = @0x201)]
    #[expected_failure(abort_code = 8, location = palate::palate)]
    fun createPushRejectsAmountBelowMinPushAmount(admin: signer, user: signer) {
        init(&admin);
        registerImage(&user, b"too-low.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount() - 1);
    }

    #[test(admin = @palate, owner = @0x202, other = @0x203)]
    #[expected_failure(abort_code = 6, location = palate::palate)]
    fun createPushRejectsNonOwnerMedia(admin: signer, owner: signer, other: signer) {
        init(&admin);
        registerImage(&owner, b"owned.png", 1);

        palate::createPush(&other, 0, palate::getMinPushAmount());
    }

    #[test(admin = @palate, user = @0x204)]
    #[expected_failure(abort_code = 7, location = palate::palate)]
    fun createPushRejectsMediaThatIsNotIdle(admin: signer, user: signer) {
        init(&admin);
        registerImage(&user, b"waiting.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::createPush(&user, 0, palate::getMinPushAmount());
    }

    #[test(admin = @palate, user = @0x205)]
    fun createPushSetsMediaStatusToWaiting(admin: signer, user: signer) {
        init(&admin);
        registerImage(&user, b"status-waiting.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount());

        assert!(palate::getMediaStatus(0) == palate::statusWaiting(), 0);
    }

    #[test(admin = @palate, user = @0x206)]
    fun cancelPushSucceedsForCreatorBeforeChallenger(admin: signer, user: signer) {
        init(&admin);
        registerImage(&user, b"cancel.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::cancelPush(&user, 0);

        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusCancelled(), 0);
    }

    #[test(admin = @palate, owner = @0x207, other = @0x208)]
    #[expected_failure(abort_code = 10, location = palate::palate)]
    fun cancelPushRejectsNonCreator(admin: signer, owner: signer, other: signer) {
        init(&admin);
        registerImage(&owner, b"cancel-non-creator.png", 1);
        palate::createPush(&owner, 0, palate::getMinPushAmount());

        palate::cancelPush(&other, 0);
    }

    #[test(admin = @palate, user = @0x209)]
    fun cancelPushRestoresMediaStatusToIdle(admin: signer, user: signer) {
        init(&admin);
        registerImage(&user, b"restore-idle.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::cancelPush(&user, 0);

        assert!(palate::getMediaStatus(0) == palate::statusIdle(), 0);
    }

    #[test(admin = @palate, pusher = @0x210, challenger = @0x211)]
    fun challengePushSucceedsWithSameCategoryIdleMedia(admin: signer, pusher: signer, challenger: signer) {
        init(&admin);
        registerMeme(&pusher, b"original.gif", 1);
        registerMeme(&challenger, b"challenger.gif", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusChallenged(), 0);
        assert!(palate::getMatchStatus(0) == palate::matchStatusActive(), 1);
    }

    #[test(admin = @palate, pusher = @0x212, challenger = @0x213)]
    #[expected_failure(abort_code = 12, location = palate::palate)]
    fun challengePushRejectsCrossCategoryMedia(admin: signer, pusher: signer, challenger: signer) {
        init(&admin);
        registerMeme(&pusher, b"original-meme.gif", 1);
        registerImage(&challenger, b"challenger-image.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, pusher = @0x214, challenger = @0x215)]
    #[expected_failure(abort_code = 13, location = palate::palate)]
    fun challengePushRejectsAmountBelowRequiredIncrement(admin: signer, pusher: signer, challenger: signer) {
        init(&admin);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0) - 1);
    }

    #[test(admin = @palate, pusher = @0x216, media_owner = @0x217, challenger = @0x218)]
    #[expected_failure(abort_code = 6, location = palate::palate)]
    fun challengePushRejectsNonOwnerChallengerMedia(
        admin: signer,
        pusher: signer,
        media_owner: signer,
        challenger: signer,
    ) {
        init(&admin);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&media_owner, b"not-owned.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, pusher = @0x219, challenger = @0x220)]
    #[expected_failure(abort_code = 7, location = palate::palate)]
    fun challengePushRejectsChallengerMediaThatIsNotIdle(admin: signer, pusher: signer, challenger: signer) {
        init(&admin);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"busy.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());
        palate::createPush(&challenger, 1, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, pusher = @0x221, challenger = @0x222)]
    fun challengePushSetsBothMediaStatusesToActive(admin: signer, pusher: signer, challenger: signer) {
        init(&admin);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        assert!(palate::getMediaStatus(0) == palate::statusActive(), 0);
        assert!(palate::getMediaStatus(1) == palate::statusActive(), 1);
    }

    #[test(admin = @palate, pusher = @0x223, challenger = @0x224)]
    fun challengePushCreatesActiveMatchWithOriginalAsAAndChallengerAsB(
        admin: signer,
        pusher: signer,
        challenger: signer,
    ) {
        init(&admin);
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

    #[test(admin = @palate, first = @0x225, second = @0x226)]
    fun getWaitingPushesReturnsOpenWaitingPushes(admin: signer, first: signer, second: signer) {
        init(&admin);
        registerImage(&first, b"first.png", 1);
        registerImage(&second, b"second.png", 2);
        palate::createPush(&first, 0, palate::getMinPushAmount());
        palate::createPush(&second, 1, palate::getMinPushAmount());
        palate::cancelPush(&second, 1);

        let pushes = palate::getWaitingPushes();
        assert!(vector::length(&pushes) == 1, 0);
        assert!(*vector::borrow(&pushes, 0) == 0, 1);
    }

    #[test(admin = @palate, pusher = @0x227, challenger = @0x228)]
    fun getActiveMatchesReturnsActiveMatches(admin: signer, pusher: signer, challenger: signer) {
        init(&admin);
        registerImage(&pusher, b"original.png", 1);
        registerImage(&challenger, b"challenger.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());
        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        let matches = palate::getActiveMatches();
        assert!(vector::length(&matches) == 1, 0);
        assert!(*vector::borrow(&matches, 0) == 0, 1);
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
}
