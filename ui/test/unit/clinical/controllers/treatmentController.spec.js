'use strict';

describe("TreatmentController", function () {

    beforeEach(module('bahmni.common.uiHelper'));
    beforeEach(module('bahmni.clinical'));

    var DateUtil = Bahmni.Common.Util.DateUtil;
    var scope, rootScope, contextChangeHandler, newTreatment, editTreatment, clinicalAppConfigService, ngDialog, retrospectiveEntryService;

    beforeEach(inject(function ($controller, $rootScope) {
        scope = $rootScope.$new();
        rootScope = $rootScope;
        $rootScope.activeAndScheduledDrugOrders = [];
        $rootScope.consultation = {};

        scope.consultation = {saveHandler: new Bahmni.Clinical.SaveHandler()};
        var now = DateUtil.now();
        ngDialog = jasmine.createSpyObj('ngDialog', ['open']);
        spyOn(Bahmni.Common.Util.DateUtil, 'now').and.returnValue(now);
        newTreatment = new Bahmni.Clinical.DrugOrderViewModel({}, {});
        editTreatment = new Bahmni.Clinical.DrugOrderViewModel(null, null);
        scope.currentBoard = {extension: {}, extensionParams: {}};
        contextChangeHandler = jasmine.createSpyObj('contextChangeHandler', ['add']);
        scope.addForm = {$invalid: false, $valid: true};

        clinicalAppConfigService = jasmine.createSpyObj('clinicalAppConfigService', ['getTreatmentActionLink', 'getDrugOrderConfig']);
        clinicalAppConfigService.getTreatmentActionLink.and.returnValue([]);
        clinicalAppConfigService.getDrugOrderConfig.and.returnValue({});

        var retrospectiveEntry = Bahmni.Common.Domain.RetrospectiveEntry.createFrom(now);
        retrospectiveEntryService = jasmine.createSpyObj('retrospectiveEntryService', ['getRetrospectiveEntry']);
        retrospectiveEntryService.getRetrospectiveEntry.and.returnValue(retrospectiveEntry);

        $controller('TreatmentController', {
            $scope: scope,
            $rootScope: rootScope,
            treatmentService: null,
            contextChangeHandler: contextChangeHandler,
            clinicalAppConfigService: clinicalAppConfigService,
            ngDialog: ngDialog,
            treatmentConfig: {},
            retrospectiveEntryService: retrospectiveEntryService
        });
    }));

    describe("add()", function () {
        it("adds treatment object to list of treatments", function () {
            var treatment = {drug: {name:true}};
            scope.treatment = treatment;
            scope.add();
            expect(scope.treatments.length).toBe(1);
            expect(scope.treatments[0]).toBe(treatment);
        });

        it("should empty treatment", function () {
            scope.treatment = {drug: {name:true}};
            scope.add();
            expect(scope.treatment.drug).toBeFalsy();
        });

        it("clears existing treatment object", function () {
            scope.treatment = {drug: {name:true}};
            scope.add();
            expect(scope.treatment.drug).toBeFalsy();
        });

        it("should set auto focus on drug name", function (){
            scope.add();
            expect(scope.startNewDrugEntry).toBeTruthy();
        });
        it("should not allow to add new order if there is already existing order", function(){
            scope.treatment = Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [], {drug: {name:"abc"}, effectiveStartDate: "2011-11-26", durationInDays: 2});
            rootScope.activeAndScheduledDrugOrders = [Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc"}, effectiveStartDate: "2011-11-26", durationInDays: 2, effectiveStopDate: "2011-11-28"})];
            expect(scope.treatments.length).toEqual(0);
            scope.add();
            expect(scope.treatments.length).toEqual(0);
            expect(ngDialog.open).toHaveBeenCalled();
        });
        it("should allow to add new drug order if new order is scheduled to start on same day as stop date of already existing order", function(){
            rootScope.activeAndScheduledDrugOrders = [Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc", uuid: "123"}, effectiveStartDate: DateUtil.parse("2014-12-02"), effectiveStopDate: DateUtil.parse("2014-12-04"), durationInDays: 2})];
            scope.treatment = Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc", uuid: "123"}, effectiveStartDate: DateUtil.parse("2014-12-04"), effectiveStopDate: DateUtil.parse("2014-12-06"), durationInDays: 2});
            expect(scope.treatments.length).toEqual(0);

            scope.add();
            expect(scope.treatments.length).toEqual(1);
            expect(scope.treatments[0].effectiveStartDate.getTime() == DateUtil.addMilliSeconds("2014-12-04", 1).getTime()).toBeTruthy();
        });

        it("should allow to add new drug order if new order is scheduled to end on same day as start date of already existing order", function(){
            rootScope.activeAndScheduledDrugOrders = [Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc", uuid: "123"}, effectiveStartDate: DateUtil.parse("2014-12-02"), effectiveStopDate: DateUtil.parse("2014-12-04"), durationInDays: 2})];
            scope.treatment = Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc", uuid: "123"}, effectiveStartDate: DateUtil.parse("2014-11-30"), effectiveStopDate: DateUtil.parse("2014-12-02"), durationInDays: 2});
            expect(scope.treatments.length).toEqual(0);

            scope.add();
            expect(scope.treatments.length).toEqual(1);
            expect(scope.treatments[0].effectiveStopDate.getTime() == DateUtil.subtractMilliSeconds("2014-12-02", 1).getTime()).toBeTruthy();
        });
        it("should allow to add new drug order if new order is scheduled to end on same day as start date of already existing order", function(){
            scope.treatments = [Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc", uuid: "123"}, effectiveStartDate: DateUtil.parse("2014-12-02"), effectiveStopDate: DateUtil.parse("2014-12-04"), durationInDays: 2})];
            scope.treatment = Bahmni.Tests.drugOrderViewModelMother.buildWith({}, [],{drug: {name:"abc", uuid: "123"}, effectiveStartDate: DateUtil.parse("2014-11-30"), effectiveStopDate: DateUtil.parse("2014-12-02"), durationInDays: 2});
            expect(scope.treatments.length).toEqual(1);

            scope.add();
            expect(scope.treatments.length).toEqual(2);
            var drugOrderToBeSaved = scope.treatments.filter(function(treatment) {return DateUtil.isSameDate(treatment.effectiveStartDate, "2014-11-30")})[0];
            expect(DateUtil.isSameDateTime(drugOrderToBeSaved.effectiveStopDate,DateUtil.subtractMilliSeconds("2014-12-02", 1))).toBeTruthy();
        });

    });

    describe("Save", function () {
        it("should check for any incomplete drug orders", function () {
            scope.treatment.drug = {name: "calpol"};
            expect(scope.incompleteDrugOrders()).toBeFalsy();

            scope.treatment = {drug: {name: "calpol"}};
            scope.addForm = {$invalid: true, $valid: false};

            expect(scope.incompleteDrugOrders()).toBeTruthy();

        });
        it("should check for any unadded drug orders", function () {
            scope.addForm = {$valid: true};
            expect(scope.unaddedDrugOrders()).toBeTruthy();
            scope.addForm = {$valid: false};
            expect(scope.unaddedDrugOrders()).toBeFalsy();
        });
    });

    describe("Clear Form", function () {
        var isSameAs = function (obj1, obj2) {
            for (var key in obj1) {
                if (key !== "_effectiveStartDate" && key !== "effectiveStartDate" && typeof obj1[key] !== 'function') {
                    if (!_.isEqual(obj1[key], obj2[key])) {
                        return false;
                    }
                }
            }
            return true;
        };
        it("should do nothing if form is blank", function () {
            scope.treatment = newTreatment;
            scope.clearForm();
            expect(isSameAs(scope.treatment[0], newTreatment)).toBeTruthy();
        });

        it("should clear treatment object", function () {
            scope.treatment = {drug: {name:'Calpol'}};
            scope.clearForm();
            expect(isSameAs(scope.treatment[0], newTreatment)).toBeTruthy();
        });

        it("should reset the treatment being edited", function () {
            scope.treatments = [editTreatment, newTreatment, newTreatment];
            scope.edit(0);
            scope.clearForm();
            expect(isSameAs(scope.treatment[2], newTreatment)).toBeTruthy();
            expect(scope.treatments[0].isBeingEdited).toBeFalsy();
            expect(scope.treatments[0].isDiscontinuedAllowed).toBeTruthy();
        });

        it("should set auto focus on drug name", function (){
            scope.clearForm();
            expect(scope.startNewDrugEntry).toBeTruthy();
        });

    });


    describe("Edit DrugOrder()", function () {
        it("should set editDrugEntryUniformFrequency to true on edit of uniform dosing type drug", function (){
            var drugOrder = Bahmni.Tests.drugOrderViewModelMother.build({}, []);
            drugOrder.frequencyType = Bahmni.Clinical.Constants.dosingTypes.uniform;
            scope.treatments = [drugOrder];
            scope.edit(0);
            expect(scope.editDrugEntryUniformFrequency).toBeTruthy();
        });

        it("should set editDrugEntryVariableFrequency to true on edit of variable dosing type drug", function (){
            var drugOrder = Bahmni.Tests.drugOrderViewModelMother.build({}, []);
            drugOrder.frequencyType = Bahmni.Clinical.Constants.dosingTypes.variable;
            scope.treatments = [drugOrder];
            scope.edit(0);
            expect(scope.editDrugEntryVariableFrequency).toBeTruthy();
        });
    });

    describe("Revise DrugOrder()", function () {
        it("should set editDrugEntryUniformFrequency to true on revise of uniform dosing type drug", function (){
            var drugOrder = Bahmni.Tests.drugOrderViewModelMother.build({}, []);
            drugOrder.frequencyType = Bahmni.Clinical.Constants.dosingTypes.uniform;
            rootScope.$broadcast("event:reviseDrugOrder", drugOrder);
            expect(scope.editDrugEntryUniformFrequency).toBeTruthy();
        });

        it("should set editDrugEntryVariableFrequency to true on revise of variable dosing type drug", function (){
            var drugOrder = Bahmni.Tests.drugOrderViewModelMother.build({}, []);
            drugOrder.frequencyType = Bahmni.Clinical.Constants.dosingTypes.variable;
            rootScope.$broadcast("event:reviseDrugOrder", drugOrder);
            expect(scope.editDrugEntryVariableFrequency).toBeTruthy();
        });
    });
    
    describe("saveTreatment()", function () {

        it("should not save the treatment if a discontinued drug order is added at the same time", function() {
            var drugOrder = Bahmni.Tests.drugOrderViewModelMother.build({}, []);
            drugOrder.durationUnit = {name: "Days"};
            drugOrder.route = {name: "Orally"};
            drugOrder.uniformDosingType.dose = "1";
            drugOrder.doseUnits = "Capsule";
            drugOrder.uniformDosingType.frequency = {name: "Once a day"};
            drugOrder.frequencyType = Bahmni.Clinical.Constants.dosingTypes.uniform;

            scope.addForm = {};
            scope.consultation.newlyAddedTreatments = [];
            scope.consultation.newlyAddedTreatments.push(drugOrder);


            var discontinuedDrug = drugOrder;
            discontinuedDrug.isMarkedForDiscontinue = true;

            scope.consultation.discontinuedDrugs = [];
            scope.consultation.discontinuedDrugs.push(discontinuedDrug);
            scope.treatments = [];
            scope.treatments.push(discontinuedDrug);

            var add = contextChangeHandler.add;
            var contextChangeFunction = add.calls.mostRecent().args[0];

            contextChangeFunction();

            expect(contextChangeFunction()["errorMessage"]).toBe(Bahmni.Clinical.Constants.errorMessages.discontinuingAndOrderingSameDrug);
        });

        it("should not fail for empty treatments", function () {
            scope.consultation.newlyAddedTreatments = undefined;
            scope.consultation.saveHandler.fire();
        });
    })
});