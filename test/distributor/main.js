'use strict';

var expect = require('expect.js'),
	sinon = require('sinon'),
	helpers = require('./helpers'),
	_ = require('underscore');


describe('Distributor main', function() {
	var distributor,
		projects = [{name: 'project1'}];

	describe('with success project', function() {
		var updateBuildSpy;

		it('instance should be created without errors', function() {
			distributor = helpers.createDistributor({
				projects: projects,
				nodes: [{type: 'local', maxExecutorsCount: 1}]
			});
			updateBuildSpy = sinon.spy(distributor, '_updateBuild');
		});

		var runErr, runResult;

		it('should run without sync errors', function(done) {
			var afterRunAndCopmplete = _.after(2, done);
			distributor.run({projectName: 'project1'}, function(err, result) {
				runErr = err;
				runResult = result;
				afterRunAndCopmplete();
			});
			distributor.on('buildCompleted', function() {
				afterRunAndCopmplete();
			});
		});

		it('should not return error at run result', function() {
			expect(runErr).not.ok();
		});

		it('should return builds at run result', function() {
			expect(runResult).ok();
			expect(runResult).only.have.keys('builds');
			expect(runResult.builds).an('array');
			expect(runResult.builds).length(1);
			expect(runResult.builds[0]).an('object');
			expect(runResult.builds[0]).have.keys(
				'id', 'status', 'completed', 'project', 'params', 'createDate'
			);
		});

		it('build should be queued', function() {
			var changes = updateBuildSpy.getCall(0).args[1];
			expect(changes).only.have.keys(
				'project', 'initiator', 'params', 'createDate', 'status',
				'completed'
			);
			expect(changes.status).equal('queued');
			expect(changes.completed).equal(false);
		});

		it('build should be in-progress', function() {
			var changes = updateBuildSpy.getCall(1).args[1];
			expect(changes).only.have.keys(
				'startDate', 'status', 'waitReason', 'node'
			);
			expect(changes.status).equal('in-progress');
			expect(changes.waitReason).equal('');
			expect(changes.node).eql(_(distributor.nodes[0]).pick('type', 'name'));
		});

		it('build should be done', function() {
			var changes = updateBuildSpy.getCall(2).args[1];
			expect(changes).only.have.keys('endDate', 'status', 'completed');
			expect(changes.status).equal('done');
			expect(changes.completed).equal(true);
		});

		it('update build called 3 times in total', function() {
			expect(updateBuildSpy.callCount).equal(3);
		});
	});

	describe('with fail project', function() {
		var updateBuildSpy;

		it('instance should be created without errors', function() {
			distributor = helpers.createDistributor({
				projects: projects,
				nodes: [{type: 'local', maxExecutorsCount: 1}],
				executorRun: sinon.stub().callsArgWithAsync(
					0,
					helpers.createExecutorProjectStepError({message: 'Some error'})
				)
			});
			updateBuildSpy = sinon.spy(distributor, '_updateBuild');
		});

		var runErr, runResult;

		it('should run without sync errors', function(done) {
			var afterRunAndCopmplete = _.after(2, done);
			distributor.run({projectName: 'project1'}, function(err, result) {
				runErr = err;
				runResult = result;
				afterRunAndCopmplete();
			});
			distributor.on('buildCompleted', function() {
				afterRunAndCopmplete();
			});
		});

		it('should not return error at run result', function() {
			expect(runErr).not.ok();
		});

		it('should return builds at run result', function() {
			expect(runResult).ok();
			expect(runResult).only.have.keys('builds');
			expect(runResult.builds).an('array');
			expect(runResult.builds).length(1);
			expect(runResult.builds[0]).an('object');
			expect(runResult.builds[0]).have.keys(
				'id', 'status', 'completed', 'project', 'params', 'createDate',
				'error'
			);
			expect(runResult.builds[0].error).an('object');
			expect(runResult.builds[0].error).have.keys('message');
		});

		it('build should be queued', function() {
			var changes = updateBuildSpy.getCall(0).args[1];
			expect(changes.status).equal('queued');
		});

		it('build should be in-progress', function() {
			var changes = updateBuildSpy.getCall(1).args[1];
			expect(changes.status).equal('in-progress');
		});

		it('build should be fail', function() {
			var changes = updateBuildSpy.getCall(2).args[1];
			expect(changes.status).equal('error');
			expect(changes.completed).equal(true);
			expect(changes.error.message).equal('Some error');
		});

		it('update build called 3 times in total', function() {
			expect(updateBuildSpy.callCount).equal(3);
		});
	});

	describe('with success project and error at run next', function() {
		var updateBuildSpy;

		it('instance should be created without errors', function() {
			distributor = helpers.createDistributor({
				projects: projects,
				nodes: [{type: 'local', maxExecutorsCount: 1}]
			});
			updateBuildSpy = sinon.spy(distributor, '_updateBuild');
			distributor._runNext = sinon.stub().callsArgWithAsync(
				0,
				new Error('Some error at run next')
			);
		});

		var runErr, runResult;

		it('should run without sync errors', function(done) {
			distributor.run({projectName: 'project1'}, function(err, result) {
				runErr = err;
				runResult = result;
				done();
			});
		});

		it('should not return error at run result', function() {
			expect(runErr).not.ok();
		});

		it('should return builds at run result', function() {
			expect(runResult).ok();
			expect(runResult).only.have.keys('builds');
			expect(runResult.builds).an('array');
			expect(runResult.builds).length(1);
			expect(runResult.builds[0]).an('object');
			expect(runResult.builds[0]).have.keys(
				'id', 'status', 'completed', 'project', 'params', 'createDate'
			);
		});

		it('update build called once', function() {
			expect(updateBuildSpy.callCount).equal(1);
		});
	});

	describe('with success project and error at update build', function() {
		var updateBuildSpy;

		it('instance should be created without errors', function() {
			distributor = helpers.createDistributor({
				projects: projects,
				nodes: [{type: 'local', maxExecutorsCount: 1}]
			});
			updateBuildSpy = sinon.stub().callsArgWithAsync(
				2,
				new Error('Some error at update build')
			);
			distributor._updateBuild = updateBuildSpy;
		});

		var runErr, runResult;

		it('should run without sync errors', function(done) {
			distributor.run({projectName: 'project1'}, function(err, result) {
				runErr = err;
				runResult = result;
				done();
			});
		});

		it('should return error at run result', function() {
			expect(runErr).ok();
			expect(runErr).an(Error);
			expect(runErr.message).equal('Some error at update build');
		});

		it('should not return builds at run result', function() {
			expect(runResult).ok();
			expect(runResult).eql({});
		});

		it('update build called once', function() {
			expect(updateBuildSpy.callCount).equal(1);
		});
	});

	describe('with success project and error at executor', function() {
		var updateBuildSpy;

		it('instance should be created without errors', function() {
			distributor = helpers.createDistributor({
				projects: projects,
				nodes: [{type: 'local', maxExecutorsCount: 1}],
				executorRun: sinon.stub().callsArgWithAsync(
					0,
					new Error('Some error at executor')
				)
			});
			updateBuildSpy = sinon.spy(distributor, '_updateBuild');
		});

		var runErr, runResult;

		it('should run without sync errors', function(done) {
			var afterRunAndCopmplete = _.after(2, done);
			distributor.run({projectName: 'project1'}, function(err, result) {
				runErr = err;
				runResult = result;
			});
			distributor.on('buildCompleted', function() {
				done();
			});
		});

		it('should not return error at run result', function() {
			expect(runErr).not.ok();
		});

		it('should return builds at run result', function() {
			expect(runResult).ok();
			expect(runResult).only.have.keys('builds');
			expect(runResult.builds).an('array');
			expect(runResult.builds).length(1);
			expect(runResult.builds[0]).an('object');
			expect(runResult.builds[0]).have.keys(
				'id', 'status', 'completed', 'project', 'params', 'createDate'
			);
		});

		it('build should be queued', function() {
			var changes = updateBuildSpy.getCall(0).args[1];
			expect(changes.status).equal('queued');
		});

		it('build should be in-progress', function() {
			var changes = updateBuildSpy.getCall(1).args[1];
			expect(changes.status).equal('in-progress');
		});

		it('build should be fail', function() {
			var changes = updateBuildSpy.getCall(2).args[1];
			expect(changes.status).equal('error');
			expect(changes.completed).equal(true);
			expect(changes.error.message).equal('Some error at executor');
		});

		it('update build called 3 times in total', function() {
			expect(updateBuildSpy.callCount).equal(3);
		});
	});

	describe('with success project and buildParams.scmRev', function() {
		var project1 = {
				name: 'project1',
				scm: {type: 'mercurial', rev: '1'}
			},
			distributorParams = {
				projects: [project1],
				nodes: [{type: 'local', maxExecutorsCount: 1}]
			};

		describe('when buildParams.scmRev is not set', function() {
			var updateBuildSpy;

			it('instance should be created without errors', function() {
				distributor = helpers.createDistributor(distributorParams);
				updateBuildSpy = sinon.spy(distributor, '_updateBuild');
			});

			it('should run without errors', function(done) {
				distributor.run({projectName: 'project1'}, done);
			});

			it('build should be queued with proper params', function() {
				var changes = updateBuildSpy.getCall(0).args[1];
				expect(changes.params).eql({});
				expect(changes.project).eql(project1);
			});
		});

		describe('when buildParams.scmRev is set', function() {
			var updateBuildSpy,
				buildParams = {scmRev: '2'};

			it('instance should be created without errors', function() {
				distributor = helpers.createDistributor(distributorParams);
				updateBuildSpy = sinon.spy(distributor, '_updateBuild');
			});

			it('should run without errors', function(done) {
				distributor.run({
					projectName: 'project1',
					buildParams: buildParams
				}, done);
			});

			it('build should be queued with proper params', function() {
				var changes = updateBuildSpy.getCall(0).args[1];
				expect(changes.params).eql(buildParams);
				expect(changes.project).eql(
					_({}).extend(
						project1,
						{scm: _({}).extend(project1.scm, {rev: buildParams.scmRev})}
					)
				);
			});
		});
	});

	describe('with archived project', function() {
		var updateBuildSpy;
		var project = {
			name: 'test_project',
			archived: true
		};

		it('instance should be created without errors', function() {
			distributor = helpers.createDistributor({
				projects: [project],
				nodes: [{type: 'local', maxExecutorsCount: 1}]
			});
			updateBuildSpy = sinon.spy(distributor, '_updateBuild');
		});

		it('should run with error', function(done) {
			distributor.run({projectName: project.name}, function(err) {
				expect(err).an(Error);
				expect(err.message).eql(
					'Can`t run archived project "' + project.name + '"'
				);

				done();
			});
		});

		it('update build should not be called', function() {
			expect(updateBuildSpy.called).equal(false);
		});
	});
});
