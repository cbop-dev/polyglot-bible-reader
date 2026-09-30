import { describe, it, expect } from 'vitest';
import { ReaderState, readerState } from './readerState.svelte';

describe('findIncompatibleVersions', ()=>{
    it('check if finds ot versions (BHS, Brenton, LXX) when given nt (SBLGNT) version', ()=>{
        const rs = new ReaderState();
        const incomp = rs.findIncompatibleVersions('SBLGNT');
        expect(incomp.length).toEqual(2);
        expect(incomp.includes('BHS')).toBe(true);
        expect(incomp.includes('LXX')).toBe(true);

        rs.addColumn('Brenton', false);
        rs.addColumn('Vulgate', false);
        rs.addColumn('WEB', false);
        const incomp2 =  rs.findIncompatibleVersions('SBLGNT');
        expect(incomp2.length).toEqual(3);
        const toFind = ['BHS', 'Brenton', 'LXX'];
        const notToFind=['Vulgate', 'WEB'];
        toFind.forEach((v)=>{
            expect(incomp2.includes(v)).toBe(true);
        });

        notToFind.forEach((v)=>{
            expect(incomp2.includes(v)).toBe(false);
        })
    });


    it('check if finds only nt versions (SBLGNT) when given ot (LXX) version', ()=>{
        const rs = new ReaderState();
        ['SBLGNT', 'KJV'].forEach((v)=>rs.addColumn(v,false));
        
        
        const incomp = rs.findIncompatibleVersions('LXX');
        expect(incomp.length).toEqual(1);

        const notToFind = ['BHS', 'LXX', 'KJV'];
        const toFind=['SBLGNT'];
        toFind.forEach((v)=>{
            expect(incomp.includes(v)).toBe(true);
        });

        notToFind.forEach((v)=>{
            expect(incomp.includes(v)).toBe(false);
        });
    });

    it('check if finds nothing when checked against bogus or complete bible versions', ()=>{
        const rs = new ReaderState();
        ['SBLGNT', 'KJV'].forEach((v)=>rs.addColumn(v,false));
        
        const incomp1 = rs.findIncompatibleVersions('nothing');
        expect(incomp1.length).toEqual(0);
        
        const incomp = rs.findIncompatibleVersions('Vulgate');
        expect(incomp.length).toEqual(0);

    });
      


});



describe('ensureVisibleCompatibleWithSelectedVersion', ()=>{
    it('adjust versions (BHS, Brenton, LXX) when selecting nt (SBLGNT) version', ()=>{
        const rs = new ReaderState();
        rs.selectVersion('SBLGNT', false);
        rs.ensureVisibleCompatibleWithSelectedVersion(false)
    
        const toFind = ['SBLGNT'];
        const notToFind=['BHS', 'Brenton', 'LXX'];;
        toFind.forEach((v)=>{
            expect(rs.visibleVersions.includes(v)).toBe(true);
        });

        notToFind.forEach((v)=>{
            console.log(`found version '${v}'! oops!`);
            expect(rs.visibleVersions.includes(v)).toBe(false);
        })
    });

});

				
//
describe('getGridRowColIdxOfVersion', ()=>{
    it('check getGridRowColIdxOfVersion', ()=>{
        const rs = new ReaderState();
        
        const rowCol = rs.getGridRowColIdxOfVersion('LXX');
        expect(rowCol[0]).toEqual(0);
        expect(rowCol[1]).toEqual(1);
    });

});

describe('realign cell', ()=>{
    it('try realigning cell automatically: rtl Vulate->ltr', ()=>{
        const rs = new ReaderState();
        
        rs.updateCell(0,0,"Vulgate", false,false);
        expect(rs.getCellAlign(0,0)).toEqual("right");
        rs.realignCell(0,0);
        expect(rs.getCellAlign(0,0)).toEqual("left");
        rs.updateCell(0,0,"BHS", false,false);
        expect(rs.getCellAlign(0,0)).toEqual("left");
        rs.realignAll();
        expect(rs.getCellAlign(0,0)).toEqual("right");
        rs.selectVersion('SBLGNT', false);
        expect(rs.versionGrid[0][0]).toEqual("KJV");
        
        expect(rs.gridAlignments[0][0]).toEqual("left");
    });

});