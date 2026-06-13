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
}
