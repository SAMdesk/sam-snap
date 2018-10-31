'use strict';

let should = require("should");
let Snap = require("../lib/snap");

//TODO insert snap config here...
let config = { };

//ignored these tests since they require config...
describe.skip('snap search tests', () => {

    it("will search term and geo", function(done){
        this.timeout(5000);

        let query = {
            geo : {
                "lat": 54.583333,
                "lng": -5.933333,
                radius : 5000
            }
        };

        let client = new Snap(config);

        client.searchSnaps(query, (err, result) => {
            should.not.exist(err);
            should.exist(result.snaps);
            //(result.snaps.length).should.be.greaterThan(1);
            return done();
        });
    });

    it("will search geo", function(done){
        this.timeout(5000);

        let query = {
            geo : {
                "lat": 54.583333,
                "lng": -5.933333,
                radius : 5000
            },
            caption_terms : ['fire']
        };

        let client = new Snap(config);

        client.searchSnaps(query, (err, result) => {
            should.not.exist(err);
            should.exist(result.snaps);
            (result.snaps.length).should.be.greaterThan(1);
            return done();
        });
    });

    it("will search term", function(done){
        this.timeout(5000);

        let query = {
            caption_terms : ['fire']
        };

        let client = new Snap(config);

        client.searchSnaps(query, (err, result) => {
            should.not.exist(err);
            should.exist(result.snaps);
            (result.snaps.length).should.be.greaterThan(1);
            return done();
        });

    });


});