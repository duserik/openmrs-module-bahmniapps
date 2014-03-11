'use strict';

angular.module('adt', ['bahmni.common.patient', 'bahmni.common.patientSearch',
    'bahmni.common.uiHelper', 'bahmni.common.conceptSet', 'authentication', 'bahmni.common.appFramework', 'httpErrorInterceptor', 'opd.adt',
    'bahmni.common.domain', 'bahmni.bedManagement', 'ui.router']);
angular.module('adt').config(['$stateProvider', '$httpProvider', function ($stateProvider, $httpProvider) {
        $stateProvider
            .state('patientsearch', {
                url: '/patient/search',
                templateUrl: '../common/patient-search/views/activePatientsList.html',
                controller : 'ActivePatientsListController',
                resolve: { initialization: 'initialization' }
            })
            .state('dashboard', {
                url: '/dashboard/patient/:patientUuid/visit/:visitUuid/:action',
                templateUrl: 'views/dashboard.html',
                controller: 'AdtController',
                resolve: { 
                    visitInitialization: function($stateParams, visitInitialization){
                        return visitInitialization($stateParams.patientUuid, $stateParams.visitUuid);    
                    } 
                }
            });
        $httpProvider.defaults.headers.common['Disable-WWW-Authenticate'] = true;
    }]).run(['backlinkService', function (backlinkService) {
        backlinkService.addUrl("ADT", "/clinical/adt/#/patient/search");
    }]);
