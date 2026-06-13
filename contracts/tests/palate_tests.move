#[test_only]
module palate::palate_tests {
    use palate::palate;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use std::signer;
    use std::vector;

    const TREASURY: address = @0xCAFE;
    const TEST_FUNDS: u64 = 1000000000000;
    const TEST_DEPOSIT: u64 = 10000000000;

    fun init(admin: &signer, framework: &signer) {
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(framework);
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
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

    #[test(admin = @palate, framework = @0x1)]
    fun initializeCreatesEmptyVaultBalances(admin: signer, framework: signer) {
        init(&admin, &framework);

        assert!(palate::getBalanceVaultBalance() == 0, 0);
        assert!(palate::getPushEscrowBalance() == 0, 1);
        assert!(palate::getBuffEscrowBalance() == 0, 2);
        assert!(palate::getCommitmentEscrowBalance() == 0, 3);
        assert!(palate::getTreasuryFeeBalance() == 0, 4);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x107)]
    fun depositBalanceIncreasesAvailableBalance(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        fundAccount(&framework, &user);

        palate::depositBalance(&user, TEST_DEPOSIT);

        assert!(palate::getAvailableBalance(signer::address_of(&user)) == TEST_DEPOSIT, 0);
        assert!(palate::getTotalDeposited(signer::address_of(&user)) == TEST_DEPOSIT, 1);
        assert!(palate::getBalanceVaultBalance() == TEST_DEPOSIT, 2);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x108)]
    fun withdrawBalanceReturnsAptToWallet(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        fundAccount(&framework, &user);
        palate::depositBalance(&user, TEST_DEPOSIT);

        let wallet_before = coin::balance<AptosCoin>(signer::address_of(&user));
        let amount = TEST_DEPOSIT / 2;
        palate::withdrawBalance(&user, amount);

        assert!(palate::getAvailableBalance(signer::address_of(&user)) == TEST_DEPOSIT - amount, 0);
        assert!(palate::getTotalWithdrawn(signer::address_of(&user)) == amount, 1);
        assert!(coin::balance<AptosCoin>(signer::address_of(&user)) == wallet_before + amount, 2);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x109)]
    #[expected_failure(abort_code = 31, location = palate::palate)]
    fun withdrawBalanceRejectsInsufficientAvailableBalance(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        fundAccount(&framework, &user);
        palate::depositBalance(&user, TEST_DEPOSIT);

        palate::withdrawBalance(&user, TEST_DEPOSIT + 1);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x110)]
    fun initialUserBalanceIsEmpty(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        assert!(palate::getAvailableBalance(signer::address_of(&user)) == 0, 0);
        assert!(palate::getLockedPushAmount(signer::address_of(&user)) == 0, 1);
        assert!(palate::getLockedBuffAmount(signer::address_of(&user)) == 0, 2);
        assert!(palate::getLockedCommitmentAmount(signer::address_of(&user)) == 0, 3);
    }

    #[test(admin = @palate, framework = @0x1)]
    fun legacyVaultHelpersStartEmpty(admin: signer, framework: signer) {
        init(&admin, &framework);

        assert!(palate::getPushEscrowBalance() == 0, 0);
        assert!(palate::getBuffEscrowBalance() == 0, 1);
        assert!(palate::getCommitmentEscrowBalance() == 0, 2);
        assert!(palate::getTreasuryFeeBalance() == 0, 3);
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
        registerImage(&framework, &user, b"push.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount());

        assert!(palate::getWaitingPushMediaId(0) == 0, 0);
        assert!(palate::getWaitingPushPusher(0) == signer::address_of(&user), 1);
        assert!(palate::getWaitingPushAmount(0) == palate::getMinPushAmount(), 2);
        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusOpen(), 3);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x229)]
    fun createPushUsesAvailableBalanceAndIncreasesPushEscrow(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"push-escrow.png", 1);

        let wallet_before = coin::balance<AptosCoin>(signer::address_of(&user));
        let available_before = palate::getAvailableBalance(signer::address_of(&user));
        let amount = palate::getMinPushAmount();
        palate::createPush(&user, 0, amount);

        assert!(palate::getPushEscrowBalance() == amount, 0);
        assert!(coin::balance<AptosCoin>(signer::address_of(&user)) == wallet_before, 1);
        assert!(palate::getAvailableBalance(signer::address_of(&user)) == available_before - amount, 2);
        assert!(palate::getLockedPushAmount(signer::address_of(&user)) == amount, 3);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x201)]
    #[expected_failure(abort_code = 8, location = palate::palate)]
    fun createPushRejectsAmountBelowMinPushAmount(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"too-low.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount() - 1);
    }

    #[test(admin = @palate, framework = @0x1, owner = @0x202, other = @0x203)]
    #[expected_failure(abort_code = 6, location = palate::palate)]
    fun createPushRejectsNonOwnerMedia(admin: signer, framework: signer, owner: signer, other: signer) {
        init(&admin, &framework);
        registerImage(&framework, &owner, b"owned.png", 1);

        palate::createPush(&other, 0, palate::getMinPushAmount());
    }

    #[test(admin = @palate, framework = @0x1, user = @0x204)]
    #[expected_failure(abort_code = 7, location = palate::palate)]
    fun createPushRejectsMediaThatIsNotIdle(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"waiting.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::createPush(&user, 0, palate::getMinPushAmount());
    }

    #[test(admin = @palate, framework = @0x1, user = @0x205)]
    fun createPushSetsMediaStatusToWaiting(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"status-waiting.png", 1);

        palate::createPush(&user, 0, palate::getMinPushAmount());

        assert!(palate::getMediaStatus(0) == palate::statusWaiting(), 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x206)]
    fun cancelPushSucceedsForCreatorBeforeChallenger(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"cancel.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::cancelPush(&user, 0);

        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusCancelled(), 0);
    }

    #[test(admin = @palate, framework = @0x1, owner = @0x207, other = @0x208)]
    #[expected_failure(abort_code = 10, location = palate::palate)]
    fun cancelPushRejectsNonCreator(admin: signer, framework: signer, owner: signer, other: signer) {
        init(&admin, &framework);
        registerImage(&framework, &owner, b"cancel-non-creator.png", 1);
        palate::createPush(&owner, 0, palate::getMinPushAmount());

        palate::cancelPush(&other, 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x209)]
    fun cancelPushRestoresMediaStatusToIdle(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"restore-idle.png", 1);
        palate::createPush(&user, 0, palate::getMinPushAmount());

        palate::cancelPush(&user, 0);

        assert!(palate::getMediaStatus(0) == palate::statusIdle(), 0);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x230)]
    fun cancelPushRefundsAvailableBalanceAndDecreasesPushEscrow(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);
        registerImage(&framework, &user, b"cancel-refund.png", 1);

        let wallet_before_push = coin::balance<AptosCoin>(signer::address_of(&user));
        let available_before_push = palate::getAvailableBalance(signer::address_of(&user));
        let amount = palate::getMinPushAmount();
        palate::createPush(&user, 0, amount);
        assert!(palate::getPushEscrowBalance() == amount, 0);

        palate::cancelPush(&user, 0);

        assert!(palate::getPushEscrowBalance() == 0, 1);
        assert!(coin::balance<AptosCoin>(signer::address_of(&user)) == wallet_before_push, 2);
        assert!(palate::getAvailableBalance(signer::address_of(&user)) == available_before_push, 3);
        assert!(palate::getLockedPushAmount(signer::address_of(&user)) == 0, 4);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x210, challenger = @0x211)]
    fun challengePushSucceedsWithSameCategoryIdleMedia(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerMeme(&framework, &pusher, b"original.gif", 1);
        registerMeme(&framework, &challenger, b"challenger.gif", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        assert!(palate::getWaitingPushStatus(0) == palate::waitingPushStatusChallenged(), 0);
        assert!(palate::getMatchStatus(0) == palate::matchStatusActive(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x231, challenger = @0x232)]
    fun challengePushUsesAvailableBalanceAndIncreasesPushEscrow(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&framework, &pusher, b"push-side-a.png", 1);
        registerImage(&framework, &challenger, b"push-side-b.png", 2);

        let push_amount = palate::getMinPushAmount();
        palate::createPush(&pusher, 0, push_amount);

        let challenger_wallet_before = coin::balance<AptosCoin>(signer::address_of(&challenger));
        let challenger_available_before = palate::getAvailableBalance(signer::address_of(&challenger));
        let challenge_amount = palate::getMinimumChallengeAmount(0);
        palate::challengePush(&challenger, 0, 1, challenge_amount);

        assert!(palate::getPushEscrowBalance() == push_amount + challenge_amount, 0);
        assert!(coin::balance<AptosCoin>(signer::address_of(&challenger)) == challenger_wallet_before, 1);
        assert!(palate::getAvailableBalance(signer::address_of(&challenger)) == challenger_available_before - challenge_amount, 2);
        assert!(palate::getLockedPushAmount(signer::address_of(&challenger)) == challenge_amount, 3);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x212, challenger = @0x213)]
    #[expected_failure(abort_code = 12, location = palate::palate)]
    fun challengePushRejectsCrossCategoryMedia(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerMeme(&framework, &pusher, b"original-meme.gif", 1);
        registerImage(&framework, &challenger, b"challenger-image.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x214, challenger = @0x215)]
    #[expected_failure(abort_code = 13, location = palate::palate)]
    fun challengePushRejectsAmountBelowRequiredIncrement(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&framework, &pusher, b"original.png", 1);
        registerImage(&framework, &challenger, b"challenger.png", 2);
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
        registerImage(&framework, &pusher, b"original.png", 1);
        registerImage(&framework, &media_owner, b"not-owned.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x219, challenger = @0x220)]
    #[expected_failure(abort_code = 7, location = palate::palate)]
    fun challengePushRejectsChallengerMediaThatIsNotIdle(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&framework, &pusher, b"original.png", 1);
        registerImage(&framework, &challenger, b"busy.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());
        palate::createPush(&challenger, 1, palate::getMinPushAmount());

        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x221, challenger = @0x222)]
    fun challengePushSetsBothMediaStatusesToActive(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        registerImage(&framework, &pusher, b"original.png", 1);
        registerImage(&framework, &challenger, b"challenger.png", 2);
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
        registerMeme(&framework, &pusher, b"original.gif", 1);
        registerMeme(&framework, &challenger, b"challenger.gif", 2);
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
        registerImage(&framework, &first, b"first.png", 1);
        registerImage(&framework, &second, b"second.png", 2);
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
        registerImage(&framework, &pusher, b"original.png", 1);
        registerImage(&framework, &challenger, b"challenger.png", 2);
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
        createImageMatch(&framework, &pusher, &challenger);

        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);

        let user_address = signer::address_of(&user);
        assert!(palate::hasCurrentAssignment(user_address), 0);
        assert!(palate::getCurrentAssignmentMatchId(user_address) == 0, 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x233, challenger = @0x234, user = @0x235)]
    fun findMatchLocksCommitmentFromAvailableBalance(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);

        let user_address = signer::address_of(&user);
        let available_before = palate::getAvailableBalance(user_address);
        let commitment = palate::getBuffCommitmentAmount();
        palate::findMatch(&user);

        assert!(palate::getAvailableBalance(user_address) == available_before - commitment, 0);
        assert!(palate::getLockedCommitmentAmount(user_address) == commitment, 1);
        assert!(palate::getCommitmentEscrowBalance() == commitment, 2);
        assert!(palate::getCurrentAssignmentSkipPenaltyAmount(user_address) == palate::getSkipPenaltyAmount(), 3);
    }

    #[test(admin = @palate, framework = @0x1, user = @0x303)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchRejectsWhenNoActiveMatchExists(admin: signer, framework: signer, user: signer) {
        init(&admin, &framework);

        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);

        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x307, challenger = @0x308)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchDoesNotAssignWhereUserIsPusherA(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        fundPalateBalance(&framework, &pusher);
        palate::findMatch(&pusher);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x309, challenger = @0x310)]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchDoesNotAssignWhereUserIsPusherB(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        fundPalateBalance(&framework, &challenger);
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
        registerImage(&framework, &owner, b"owned.png", 1);
        registerImage(&framework, &challenger, b"challenger.png", 2);
        palate::createPush(&owner, 0, palate::getMinPushAmount());
        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));

        // Use a distinct signer from pusher/challenger to prove media ownership is checked.
        // The owner is also pusher A here, so either exclusion keeps the match invalid.
        fundPalateBalance(&framework, &owner);
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
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds() + 1);

        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        user = @0x539,
        invalid_challenger = @0x540,
        valid_pusher = @0x541,
        valid_challenger = @0x542
    )]
    #[expected_failure(abort_code = 17, location = palate::palate)]
    fun findMatchUsesRandomRetryCountAndStopsBeforeLaterValidMatch(
        admin: signer,
        framework: signer,
        user: signer,
        invalid_challenger: signer,
        valid_pusher: signer,
        valid_challenger: signer,
    ) {
        init(&admin, &framework);
        createImageMatchWithIds(&framework, &user, &invalid_challenger, 0, 1, 0);
        createImageMatchWithIds(&framework, &valid_pusher, &valid_challenger, 2, 3, 1);
        palate::updateMatchConfigForTesting(&admin, palate::getMatchDurationSeconds(), 1);
        setAssignmentNonceForStart(&admin, signer::address_of(&user), 0);

        // MVP pseudo-randomness starts at match index 0 here. Retry count is 1,
        // so findMatch must not scan forward to the valid match at index 1.
        palate::findMatch(&user);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        user = @0x543,
        invalid_challenger = @0x544,
        valid_pusher = @0x545,
        valid_challenger = @0x546
    )]
    fun findMatchRetryCountCanReachLaterValidMatch(
        admin: signer,
        framework: signer,
        user: signer,
        invalid_challenger: signer,
        valid_pusher: signer,
        valid_challenger: signer,
    ) {
        init(&admin, &framework);
        createImageMatchWithIds(&framework, &user, &invalid_challenger, 0, 1, 0);
        createImageMatchWithIds(&framework, &valid_pusher, &valid_challenger, 2, 3, 1);
        palate::updateMatchConfigForTesting(&admin, palate::getMatchDurationSeconds(), 2);
        setAssignmentNonceForStart(&admin, signer::address_of(&user), 0);

        palate::findMatch(&user);

        assert!(palate::getCurrentAssignmentMatchId(signer::address_of(&user)) == 1, 0);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        user = @0x547,
        pusher_one = @0x548,
        challenger_one = @0x549,
        pusher_two = @0x550,
        challenger_two = @0x551
    )]
    fun repeatedFindSkipCanReachMoreThanFirstActiveMatchWithMvpPseudoRandomness(
        admin: signer,
        framework: signer,
        user: signer,
        pusher_one: signer,
        challenger_one: signer,
        pusher_two: signer,
        challenger_two: signer,
    ) {
        init(&admin, &framework);
        createImageMatchWithIds(&framework, &pusher_one, &challenger_one, 0, 1, 0);
        createImageMatchWithIds(&framework, &pusher_two, &challenger_two, 2, 3, 1);
        fundPalateBalance(&framework, &user);

        // This documents MVP pseudo-random assignment behavior only. It is not
        // intended to be mainnet-secure randomness.
        setAssignmentNonceForStart(&admin, signer::address_of(&user), 1);
        palate::findMatch(&user);
        assert!(palate::getCurrentAssignmentMatchId(signer::address_of(&user)) == 1, 0);
        palate::skipMatch(&user);

        setAssignmentNonceForStart(&admin, signer::address_of(&user), 0);
        palate::findMatch(&user);
        assert!(palate::getCurrentAssignmentMatchId(signer::address_of(&user)) == 0, 1);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);

        palate::skipMatch(&user);

        assert!(!palate::hasCurrentAssignment(signer::address_of(&user)), 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x236, challenger = @0x237, user = @0x238)]
    fun skipMatchMovesPenaltyToTreasuryAndRefundsRemainder(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);

        let user_address = signer::address_of(&user);
        let available_before = palate::getAvailableBalance(user_address);
        let commitment = palate::getBuffCommitmentAmount();
        let penalty = palate::getSkipPenaltyAmount();
        palate::findMatch(&user);
        palate::skipMatch(&user);

        assert!(palate::getAvailableBalance(user_address) == available_before - penalty, 0);
        assert!(palate::getLockedCommitmentAmount(user_address) == 0, 1);
        assert!(palate::getTreasuryFeeBalance() == penalty, 2);
        assert!(palate::getCommitmentEscrowBalance() == 0, 3);
        assert!(commitment >= penalty, 4);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x323, challenger = @0x324, user = @0x325)]
    fun skipMatchClearsAssignment(admin: signer, framework: signer, pusher: signer, challenger: signer, user: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::skipMatch(&user);

        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);

        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        assert!(palate::getBuffRecordCount() == 1, 0);
        assert!(!palate::hasCurrentAssignment(signer::address_of(&user)), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x239, challenger = @0x240, user = @0x241)]
    fun placeBuffUsesAvailableBalanceAndRefundsCommitment(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);

        let user_address = signer::address_of(&user);
        let available_before_find = palate::getAvailableBalance(user_address);
        let commitment = palate::getBuffCommitmentAmount();
        let amount = palate::getMinBuffAmount();
        palate::findMatch(&user);
        assert!(palate::getAvailableBalance(user_address) == available_before_find - commitment, 0);

        palate::placeBuff(&user, palate::sideA(), amount);

        assert!(palate::getAvailableBalance(user_address) == available_before_find - amount, 1);
        assert!(palate::getLockedCommitmentAmount(user_address) == 0, 2);
        assert!(palate::getLockedBuffAmount(user_address) == amount, 3);
        assert!(palate::getBuffEscrowBalance() == amount, 4);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        fundPalateBalance(&framework, &user);
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
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);

        let amount = palate::getMinBuffAmount() * 3;
        let config = palate::getProtocolConfig();
        let expected_score = palate::calculateBuffScore(amount, &config);
        palate::placeBuff(&user, palate::sideA(), amount);

        assert!(palate::getMatchBuffPoolA(0) == amount, 0);
        assert!(palate::getMatchScoreA(0) == expected_score, 1);
        assert!(palate::getMatchScoreA(0) != amount, 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x364, challenger = @0x365)]
    #[expected_failure(abort_code = 23, location = palate::palate)]
    fun settleMatchRejectsBeforeEndTime(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        palate::settleMatch(&pusher, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x366, challenger = @0x367)]
    #[expected_failure(abort_code = 24, location = palate::palate)]
    fun settleMatchRejectsAlreadySettledMatch(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        palate::settleMatch(&pusher, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x368, challenger = @0x369)]
    fun settleMatchSettlesAfterEndTime(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchStatus(0) == palate::matchStatusSettled(), 0);
        assert!(palate::getMatchSettledTime(0) == palate::getMatchDurationSeconds(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x370, challenger = @0x371, user = @0x372)]
    fun sideAWinsWhenScoreAIsGreater(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&user, 0);

        assert!(palate::getMatchWinnerSide(0) == palate::sideA(), 0);
        assert!(palate::getUserSummaryPushWinCount(signer::address_of(&pusher)) == 1, 1);
        assert!(palate::getUserSummaryPushLossCount(signer::address_of(&challenger)) == 1, 2);
        assert!(palate::getUserSummaryBuffWinCount(signer::address_of(&user)) == 1, 3);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x373, challenger = @0x374, user = @0x375)]
    fun sideBWinsWhenScoreBIsGreater(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideB(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&user, 0);

        assert!(palate::getMatchWinnerSide(0) == palate::sideB(), 0);
        assert!(palate::getUserSummaryPushWinCount(signer::address_of(&challenger)) == 1, 1);
        assert!(palate::getUserSummaryPushLossCount(signer::address_of(&pusher)) == 1, 2);
        assert!(palate::getUserSummaryBuffWinCount(signer::address_of(&user)) == 1, 3);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x376, challenger = @0x377)]
    fun sideAWinsWhenScoresAreTied(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchScoreA(0) == 0, 0);
        assert!(palate::getMatchScoreB(0) == 0, 1);
        assert!(palate::getMatchWinnerSide(0) == palate::sideA(), 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x378, challenger = @0x379)]
    fun settledMatchStatusIsSetCorrectly(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchStatus(0) == palate::matchStatusSettled(), 0);
        assert!(palate::getMatchProtocolFeeBpsSnapshot(0) == palate::getProtocolFeeBps(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x380, challenger = @0x381)]
    fun bothMediaStatusesBecomeSettled(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMediaStatus(0) == palate::statusSettled(), 0);
        assert!(palate::getMediaStatus(1) == palate::statusSettled(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x382, challenger = @0x383)]
    fun settleMatchDoesNotRequireMinimumBuffCount(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchWinnerSide(0) == palate::sideA(), 0);
        assert!(palate::getMatchBuffCountA(0) == 0, 1);
        assert!(palate::getMatchBuffCountB(0) == 0, 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x384, challenger = @0x385)]
    fun settleMatchDoesNotRequireMinimumTotalScore(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchScoreA(0) == 0, 0);
        assert!(palate::getMatchScoreB(0) == 0, 1);
        assert!(palate::getMatchStatus(0) == palate::matchStatusSettled(), 2);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x386, challenger = @0x387)]
    fun settleMatchDoesNotCancelLowOrZeroBuffActiveMatches(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchStatus(0) == palate::matchStatusSettled(), 0);
        assert!(palate::getMatchWinnerSide(0) == palate::sideA(), 1);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x388,
        challenger = @0x389,
        user_a_one = @0x390,
        user_a_two = @0x391,
        user_b = @0x392
    )]
    fun winnerSelectionUsesScoreNotRawBuffPool(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user_a_one: signer,
        user_a_two: signer,
        user_b: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        fundPalateBalance(&framework, &user_a_one);
        palate::findMatch(&user_a_one);
        palate::placeBuff(&user_a_one, palate::sideA(), palate::getMinBuffAmount());
        fundPalateBalance(&framework, &user_a_two);
        palate::findMatch(&user_a_two);
        palate::placeBuff(&user_a_two, palate::sideA(), palate::getMinBuffAmount());
        fundPalateBalance(&framework, &user_b);
        palate::findMatch(&user_b);
        palate::placeBuff(&user_b, palate::sideB(), palate::getMinBuffAmount() * 3);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchBuffPoolB(0) > palate::getMatchBuffPoolA(0), 0);
        assert!(palate::getMatchScoreA(0) == palate::getMatchScoreB(0), 1);
        assert!(palate::getMatchWinnerSide(0) == palate::sideA(), 2);
        assert!(palate::getUserSummaryBuffLossCount(signer::address_of(&user_b)) == 1, 3);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x393, challenger = @0x394)]
    fun matchSettledEventPathSetsSettlementFields(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());

        palate::settleMatch(&pusher, 0);

        assert!(palate::getMatchWinnerSide(0) == palate::sideA(), 0);
        assert!(palate::getMatchSettledTime(0) == palate::getMatchDurationSeconds(), 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x395, challenger = @0x396)]
    fun winningPusherCanClaimAfterSettlement(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let pusher_address = signer::address_of(&pusher);
        let available_before = palate::getAvailableBalance(pusher_address);
        let locked_before = palate::getLockedPushAmount(pusher_address);
        let claim_amount = palate::estimatePushClaimAmount(pusher_address, 0);
        palate::claimPush(&pusher, 0);

        assert!(palate::isPushClaimed(0), 0);
        assert!(palate::getUserSummaryPushProfit(signer::address_of(&pusher)) == palate::getMinimumChallengeAmount(0) - palate::getMatchPushFeeAmount(0), 1);
        assert!(palate::getAvailableBalance(pusher_address) == available_before + claim_amount, 2);
        assert!(palate::getLockedPushAmount(pusher_address) == locked_before - palate::getMatchPushAmountA(0), 3);
        assert!(palate::getTotalClaimed(pusher_address) == claim_amount, 4);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x397, challenger = @0x398)]
    #[expected_failure(abort_code = 26, location = palate::palate)]
    fun losingPusherCannotClaim(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        palate::claimPush(&challenger, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x399, challenger = @0x400)]
    #[expected_failure(abort_code = 25, location = palate::palate)]
    fun pusherCannotClaimBeforeSettlement(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        palate::claimPush(&pusher, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x401, challenger = @0x402)]
    #[expected_failure(abort_code = 27, location = palate::palate)]
    fun pusherCannotDoubleClaim(admin: signer, framework: signer, pusher: signer, challenger: signer) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);
        palate::claimPush(&pusher, 0);

        palate::claimPush(&pusher, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x403, challenger = @0x404)]
    fun pushClaimAmountEqualsOwnPushPlusLoserAfterFee(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let expected = palate::getMatchPushAmountA(0) + palate::getMatchPushAmountB(0) - palate::getMatchPushFeeAmount(0);

        assert!(palate::estimatePushClaimAmount(signer::address_of(&pusher), 0) == expected, 0);
        assert!(palate::getMatchPushFeeAmount(0) == (palate::getMatchPushAmountB(0) * palate::getProtocolFeeBps()) / 10000, 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x405, challenger = @0x406, user = @0x407)]
    fun winningBuffUserCanClaimAfterSettlement(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let user_address = signer::address_of(&user);
        let available_before = palate::getAvailableBalance(user_address);
        let locked_before = palate::getLockedBuffAmount(user_address);
        let claim_amount = palate::estimateBuffClaimAmount(user_address, 0);
        palate::claimBuff(&user, 0);

        assert!(palate::isBuffClaimed(signer::address_of(&user), 0), 0);
        assert!(palate::getUserSummaryBuffProfit(signer::address_of(&user)) == 0, 1);
        assert!(palate::getAvailableBalance(user_address) == available_before + claim_amount, 2);
        assert!(palate::getLockedBuffAmount(user_address) == locked_before - palate::getMinBuffAmount(), 3);
        assert!(palate::getTotalClaimed(user_address) == claim_amount, 4);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x408, challenger = @0x409, winner = @0x410, loser = @0x411)]
    #[expected_failure(abort_code = 29, location = palate::palate)]
    fun losingBuffUserCannotClaim(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        winner: signer,
        loser: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &winner);
        palate::findMatch(&winner);
        palate::placeBuff(&winner, palate::sideA(), palate::getMinBuffAmount() * 3);
        fundPalateBalance(&framework, &loser);
        palate::findMatch(&loser);
        palate::placeBuff(&loser, palate::sideB(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        palate::claimBuff(&loser, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x412, challenger = @0x413, user = @0x414)]
    #[expected_failure(abort_code = 25, location = palate::palate)]
    fun buffUserCannotClaimBeforeSettlement(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        palate::claimBuff(&user, 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x415, challenger = @0x416, user = @0x417)]
    #[expected_failure(abort_code = 30, location = palate::palate)]
    fun buffUserCannotDoubleClaim(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);
        palate::claimBuff(&user, 0);

        palate::claimBuff(&user, 0);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x417,
        challenger = @0x418,
        winner_one = @0x419,
        winner_two = @0x420,
        loser = @0x421
    )]
    fun buffClaimAmountUsesRawBuffAndLosingPoolAfterFee(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        winner_one: signer,
        winner_two: signer,
        loser: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        let min = palate::getMinBuffAmount();

        fundPalateBalance(&framework, &winner_one);
        palate::findMatch(&winner_one);
        palate::placeBuff(&winner_one, palate::sideA(), min);
        fundPalateBalance(&framework, &winner_two);
        palate::findMatch(&winner_two);
        palate::placeBuff(&winner_two, palate::sideA(), min);
        fundPalateBalance(&framework, &loser);
        palate::findMatch(&loser);
        palate::placeBuff(&loser, palate::sideB(), min * 3);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let losing_after_fee = palate::getMatchBuffPoolB(0) - palate::getMatchBuffFeeAmountB(0);
        let expected = min + (min * losing_after_fee) / palate::getMatchBuffPoolA(0);

        assert!(palate::estimateBuffClaimAmount(signer::address_of(&winner_one), 0) == expected, 0);
        assert!(expected == 24250000, 1);
        assert!(palate::getMatchBuffFeeAmountB(0) == (palate::getMatchBuffPoolB(0) * palate::getProtocolFeeBps()) / 10000, 2);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x422,
        challenger = @0x423,
        small = @0x424,
        large = @0x425,
        loser = @0x426
    )]
    fun buffPayoutShareUsesRawAmountNotCalculatedScore(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        small: signer,
        large: signer,
        loser: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        let min = palate::getMinBuffAmount();

        fundPalateBalance(&framework, &small);
        palate::findMatch(&small);
        palate::placeBuff(&small, palate::sideA(), min);
        fundPalateBalance(&framework, &large);
        palate::findMatch(&large);
        palate::placeBuff(&large, palate::sideA(), min * 3);
        fundPalateBalance(&framework, &loser);
        palate::findMatch(&loser);
        palate::placeBuff(&loser, palate::sideB(), min * 7);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let small_claim = palate::estimateBuffClaimAmount(signer::address_of(&small), 0);
        let large_claim = palate::estimateBuffClaimAmount(signer::address_of(&large), 0);

        assert!(large_claim > small_claim * 2, 0);
        assert!(large_claim < small_claim * 4, 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x427, challenger = @0x428, user = @0x429)]
    fun zeroLosingBuffPoolIsHandledSafely(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        assert!(palate::estimateBuffClaimAmount(signer::address_of(&user), 0) == palate::getMinBuffAmount(), 0);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x430, challenger = @0x431, loser = @0x432)]
    fun zeroWinningBuffPoolIsHandledSafely(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        loser: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        assert!(!palate::isBuffRewardClaimable(signer::address_of(&loser), 0), 0);
        assert!(palate::estimateBuffClaimAmount(signer::address_of(&loser), 0) == 0, 1);
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x433, challenger = @0x434, user = @0x435)]
    fun claimHelpersReturnCorrectValuesAndClaimsDoNotTransferApt(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());

        assert!(!palate::isPushRewardClaimable(signer::address_of(&pusher), 0), 0);
        assert!(palate::estimatePushClaimAmount(signer::address_of(&pusher), 0) == 0, 1);
        assert!(palate::estimateBuffClaimAmount(signer::address_of(&user), 0) == 0, 2);

        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        assert!(palate::isPushRewardClaimable(signer::address_of(&pusher), 0), 3);
        assert!(palate::isBuffRewardClaimable(signer::address_of(&user), 0), 4);
        palate::claimPush(&pusher, 0);
        palate::claimBuff(&user, 0);

        assert!(palate::isPushClaimed(0), 5);
        assert!(palate::isBuffClaimed(signer::address_of(&user), 0), 6);
        assert!(!palate::isPushRewardClaimable(signer::address_of(&pusher), 0), 7);
        assert!(!palate::isBuffRewardClaimable(signer::address_of(&user), 0), 8);
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x500,
        challenger = @0x501,
        user = @0x502
    )]
    fun accountingInvariantHoldsAcrossFullBalanceFlow(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        fundAccount(&framework, &pusher);
        fundAccount(&framework, &challenger);
        fundAccount(&framework, &user);

        palate::depositBalance(&pusher, TEST_DEPOSIT);
        assertVaultInvariant();
        palate::depositBalance(&challenger, TEST_DEPOSIT);
        assertVaultInvariant();
        palate::depositBalance(&user, TEST_DEPOSIT);
        assertVaultInvariant();

        registerImageWithoutDeposit(&pusher, b"invariant-a.png", 1);
        registerImageWithoutDeposit(&challenger, b"invariant-b.png", 2);
        palate::createPush(&pusher, 0, palate::getMinPushAmount());
        assertVaultInvariant();
        palate::challengePush(&challenger, 0, 1, palate::getMinimumChallengeAmount(0));
        assertVaultInvariant();

        palate::findMatch(&user);
        assertVaultInvariant();
        palate::skipMatch(&user);
        assertVaultInvariant();
        palate::findMatch(&user);
        assertVaultInvariant();
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        assertVaultInvariant();

        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);
        assertVaultInvariant();
        palate::claimPush(&pusher, 0);
        assertVaultInvariant();
        palate::claimBuff(&user, 0);
        assertVaultInvariant();

        let withdraw_amount = palate::getMinBuffAmount();
        palate::withdrawBalance(&user, withdraw_amount);
        assertVaultInvariant();
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x503, challenger = @0x504)]
    fun claimPushCreditsAvailableBalanceNotWalletUntilWithdraw(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let pusher_address = signer::address_of(&pusher);
        let wallet_before_claim = coin::balance<AptosCoin>(pusher_address);
        let available_before_claim = palate::getAvailableBalance(pusher_address);
        let claim_amount = palate::estimatePushClaimAmount(pusher_address, 0);
        palate::claimPush(&pusher, 0);

        assert!(coin::balance<AptosCoin>(pusher_address) == wallet_before_claim, 0);
        assert!(palate::getAvailableBalance(pusher_address) == available_before_claim + claim_amount, 1);

        palate::withdrawBalance(&pusher, claim_amount);
        assert!(coin::balance<AptosCoin>(pusher_address) == wallet_before_claim + claim_amount, 2);
        assertVaultInvariant();
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x505, challenger = @0x506, user = @0x507)]
    fun claimBuffCreditsAvailableBalanceNotWalletUntilWithdraw(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let user_address = signer::address_of(&user);
        let wallet_before_claim = coin::balance<AptosCoin>(user_address);
        let available_before_claim = palate::getAvailableBalance(user_address);
        let claim_amount = palate::estimateBuffClaimAmount(user_address, 0);
        palate::claimBuff(&user, 0);

        assert!(coin::balance<AptosCoin>(user_address) == wallet_before_claim, 0);
        assert!(palate::getAvailableBalance(user_address) == available_before_claim + claim_amount, 1);

        palate::withdrawBalance(&user, claim_amount);
        assert!(coin::balance<AptosCoin>(user_address) == wallet_before_claim + claim_amount, 2);
        assertVaultInvariant();
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x508, challenger = @0x509, user = @0x510)]
    fun skipMatchUsesPenaltySnapshotAfterConfigChange(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        fundPalateBalance(&framework, &user);

        let original_penalty = palate::getSkipPenaltyAmount();
        palate::findMatch(&user);
        palate::updateBuffConfigForTesting(
            &admin,
            palate::getMinBuffAmount(),
            palate::getBuffCommitmentAmount() * 2,
            original_penalty / 2,
        );
        palate::skipMatch(&user);

        assert!(palate::getTreasuryFeeBalance() == original_penalty, 0);
        assertVaultInvariant();
    }

    #[test(admin = @palate, framework = @0x1)]
    #[expected_failure(abort_code = 32, location = palate::palate)]
    fun buffConfigRejectsSkipPenaltyAboveCommitment(admin: signer, framework: signer) {
        init(&admin, &framework);

        palate::updateBuffConfigForTesting(
            &admin,
            palate::getMinBuffAmount(),
            palate::getBuffCommitmentAmount(),
            palate::getBuffCommitmentAmount() + 1,
        );
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x511,
        challenger = @0x512,
        winner_one = @0x513,
        winner_two = @0x514,
        winner_three = @0x515,
        loser = @0x516
    )]
    fun buffPayoutRoundingDustRemainsBackedByModuleApt(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        winner_one: signer,
        winner_two: signer,
        winner_three: signer,
        loser: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);
        let min = palate::getMinBuffAmount();

        fundPalateBalance(&framework, &winner_one);
        palate::findMatch(&winner_one);
        palate::placeBuff(&winner_one, palate::sideA(), min);
        fundPalateBalance(&framework, &winner_two);
        palate::findMatch(&winner_two);
        palate::placeBuff(&winner_two, palate::sideA(), min);
        fundPalateBalance(&framework, &winner_three);
        palate::findMatch(&winner_three);
        palate::placeBuff(&winner_three, palate::sideA(), min);
        fundPalateBalance(&framework, &loser);
        palate::findMatch(&loser);
        palate::placeBuff(&loser, palate::sideB(), min);

        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);
        let buff_fee = palate::getMatchBuffFeeAmountB(0);

        palate::claimBuff(&winner_one, 0);
        palate::claimBuff(&winner_two, 0);
        palate::claimBuff(&winner_three, 0);

        assert!(palate::getBuffEscrowBalance() == 2, 0);
        assert!(palate::getTreasuryFeeBalance() == palate::getMatchPushFeeAmount(0) + buff_fee, 1);
        assertVaultInvariant();
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x517,
        challenger = @0x518,
        user = @0x519,
        loser = @0x520
    )]
    fun treasuryFeesAreBackedAfterSkipPenaltyAndProtocolFees(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
        loser: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::skipMatch(&user);
        let skip_penalty = palate::getSkipPenaltyAmount();

        fundPalateBalance(&framework, &user);
        palate::findMatch(&user);
        palate::placeBuff(&user, palate::sideA(), palate::getMinBuffAmount());
        fundPalateBalance(&framework, &loser);
        palate::findMatch(&loser);
        palate::placeBuff(&loser, palate::sideB(), palate::getMinBuffAmount());

        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        let expected_treasury = skip_penalty
            + palate::getMatchPushFeeAmount(0)
            + palate::getMatchBuffFeeAmountB(0);
        assert!(palate::getTreasuryFeeBalance() == expected_treasury, 0);
        assert!(palate::getTotalVaultBalance() >= palate::getTreasuryFeeBalance(), 1);
        assertVaultInvariant();
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x521, challenger = @0x522, user = @0x523)]
    fun treasuryFeeBalanceIncreasesAfterSkipPenalty(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);

        let penalty = createSkipPenalty(&framework, &pusher, &challenger, &user);

        assert!(palate::getTreasuryFeeBalance() == penalty, 0);
        assertVaultInvariant();
    }

    #[test(admin = @palate, framework = @0x1, pusher = @0x524, challenger = @0x525)]
    fun treasuryFeeBalanceIncreasesAfterSettlementProtocolFee(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
    ) {
        init(&admin, &framework);
        createImageMatch(&framework, &pusher, &challenger);

        timestamp::fast_forward_seconds(palate::getMatchDurationSeconds());
        palate::settleMatch(&pusher, 0);

        assert!(palate::getTreasuryFeeBalance() == palate::getMatchPushFeeAmount(0), 0);
        assert!(palate::getTreasuryFeeBalance() > 0, 1);
        assertVaultInvariant();
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        treasury = @0xCAFE,
        pusher = @0x526,
        challenger = @0x527,
        user = @0x528
    )]
    fun configuredTreasuryCanWithdrawTreasuryFees(
        admin: signer,
        framework: signer,
        treasury: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        fundAccount(&framework, &treasury);
        let fee_amount = createSkipPenalty(&framework, &pusher, &challenger, &user);
        let treasury_wallet_before = coin::balance<AptosCoin>(TREASURY);
        let user_available_before = palate::getAvailableBalance(signer::address_of(&user));

        palate::withdrawTreasuryFees(&treasury, fee_amount);

        assert!(palate::getTreasuryFeeBalance() == 0, 0);
        assert!(coin::balance<AptosCoin>(TREASURY) == treasury_wallet_before + fee_amount, 1);
        assert!(palate::getAvailableBalance(signer::address_of(&user)) == user_available_before, 2);
        assertVaultInvariant();
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        treasury = @0xCAFE,
        pusher = @0x529,
        challenger = @0x530,
        user = @0x531
    )]
    fun adminCanWithdrawTreasuryFeesToConfiguredTreasuryWallet(
        admin: signer,
        framework: signer,
        treasury: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        fundAccount(&framework, &treasury);
        let fee_amount = createSkipPenalty(&framework, &pusher, &challenger, &user);
        let treasury_wallet_before = coin::balance<AptosCoin>(TREASURY);

        palate::withdrawTreasuryFees(&admin, fee_amount);

        assert!(palate::getTreasuryFeeBalance() == 0, 0);
        assert!(coin::balance<AptosCoin>(TREASURY) == treasury_wallet_before + fee_amount, 1);
        assertVaultInvariant();
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        pusher = @0x532,
        challenger = @0x533,
        user = @0x534,
        unauthorized = @0x535
    )]
    #[expected_failure(abort_code = 33, location = palate::palate)]
    fun unauthorizedUserCannotWithdrawTreasuryFees(
        admin: signer,
        framework: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
        unauthorized: signer,
    ) {
        init(&admin, &framework);
        createSkipPenalty(&framework, &pusher, &challenger, &user);

        palate::withdrawTreasuryFees(&unauthorized, palate::getTreasuryFeeBalance());
    }

    #[test(
        admin = @palate,
        framework = @0x1,
        treasury = @0xCAFE,
        pusher = @0x536,
        challenger = @0x537,
        user = @0x538
    )]
    #[expected_failure(abort_code = 34, location = palate::palate)]
    fun cannotWithdrawMoreThanTreasuryFeeBalance(
        admin: signer,
        framework: signer,
        treasury: signer,
        pusher: signer,
        challenger: signer,
        user: signer,
    ) {
        init(&admin, &framework);
        fundAccount(&framework, &treasury);
        createSkipPenalty(&framework, &pusher, &challenger, &user);

        palate::withdrawTreasuryFees(&treasury, palate::getTreasuryFeeBalance() + 1);
    }

    fun registerImage(framework: &signer, user: &signer, blob_ref: vector<u8>, created_time: u64) {
        fundPalateBalance(framework, user);
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

    fun registerMeme(framework: &signer, user: &signer, blob_ref: vector<u8>, created_time: u64) {
        fundPalateBalance(framework, user);
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

    fun registerImageWithoutDeposit(user: &signer, blob_ref: vector<u8>, created_time: u64) {
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

    fun createImageMatch(framework: &signer, pusher: &signer, challenger: &signer) {
        registerImage(framework, pusher, b"original.png", 1);
        registerImage(framework, challenger, b"challenger.png", 2);
        palate::createPush(pusher, 0, palate::getMinPushAmount());
        palate::challengePush(challenger, 0, 1, palate::getMinimumChallengeAmount(0));
    }

    fun createImageMatchWithIds(
        framework: &signer,
        pusher: &signer,
        challenger: &signer,
        media_a_id: u64,
        media_b_id: u64,
        push_id: u64,
    ) {
        registerImage(framework, pusher, b"original.png", media_a_id + 1);
        registerImage(framework, challenger, b"challenger.png", media_b_id + 1);
        palate::createPush(pusher, media_a_id, palate::getMinPushAmount());
        palate::challengePush(challenger, push_id, media_b_id, palate::getMinimumChallengeAmount(push_id));
    }

    fun createSkipPenalty(
        framework: &signer,
        pusher: &signer,
        challenger: &signer,
        user: &signer,
    ): u64 {
        createImageMatch(framework, pusher, challenger);
        fundPalateBalance(framework, user);
        palate::findMatch(user);
        palate::skipMatch(user);
        palate::getSkipPenaltyAmount()
    }

    fun fundAccount(framework: &signer, account: &signer) {
        if (!coin::is_account_registered<AptosCoin>(signer::address_of(account))) {
            coin::register<AptosCoin>(account);
        };
        aptos_coin::mint(framework, signer::address_of(account), TEST_FUNDS);
    }

    fun fundPalateBalance(framework: &signer, account: &signer) {
        fundAccount(framework, account);
        palate::depositBalance(account, TEST_DEPOSIT);
    }

    fun setAssignmentNonceForStart(admin: &signer, user: address, target_start_index: u64) {
        let nonce = 0;
        while (nonce < 128) {
            palate::setAssignmentNonceForTesting(admin, nonce);
            if (palate::getNextAssignmentStartIndexForTesting(user) == target_start_index) {
                return
            };
            nonce = nonce + 1;
        };
        abort 998
    }

    fun assertVaultInvariant() {
        assert!(
            palate::getTotalVaultBalance()
                == palate::getAggregateTotalDepositedForTesting()
                    - palate::getAggregateTotalWithdrawnForTesting()
                    - palate::getTotalTreasuryWithdrawnForTesting(),
            999,
        );
    }
}
